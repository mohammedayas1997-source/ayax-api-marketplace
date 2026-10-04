/**
 * Global Plan Vending Dispatcher Engine (Version 2.0)
 * Path: backend/src/services/dataDispatcher.service.js
 * 
 * 1. PLATFORM AUTOMATION FEE:
 *    - A duk lokacin da aka tura data ta SIM din developer (MyMTN Web), ana cire ₦2 a babban wallet dinsa.
 *    - Dole wallet dinsa ya kasance yana da akalla ₦2 kafin oda ta fita.
 * 
 * 2. HYBRID FAILOVER (SIM EMPTY -> API MARKETPLACE):
 *    - Idan SIM din developer ya kare datarsa (ko yana offline), tsarin zai duba ko ya kunna "Fallback to API Marketplace".
 *    - Idan a kunne yake, tsarin zai cire kudin plan din daga wallet dinsa, ya fitar da datan ta hanyar Master API Marketplace!
 */

const prisma = require("../config/prisma");
const planSimPoolService = require("./planSimPool.service");
const mymtnGateway = require("./mymtn.gateway");
const { emitEvent } = require("../config/socket");

class GlobalDataDispatcher {
  /**
   * Main Dispatcher
   * @param {Object} params - { recipientPhone, planId, reference, userId, channel }
   */
  async processDataVending({ recipientPhone, planId, reference, userId, channel = "API" }) {
    const cleanPlanId = String(planId).trim();
    const targetRecipient = String(recipientPhone).trim();
    const orderRef = reference || `TX_${Date.now()}`;

    // 1. NEMO DEVELOPER DA WALLET DINSA
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new Error("Unauthorized user or account not found.");
    }

    const walletBalance = Number(user.wallet?.balance || 0);

    // 2. NEMO DEDICATED SIM POOL NA WANNAN DEVELOPER
    const poolCheck = await planSimPoolService.getNextAvailableSimForPlan(cleanPlanId, userId);

    // =========================================================================
    // CASE A: DEVELOPER YANA DA SIM MAI DATA A KAN WANNAN PLAN DIN (₦2 FEE ONLY)
    // =========================================================================
    if (poolCheck.available && poolCheck.sim) {
      const activeSim = poolCheck.sim;
      const AUTOMATION_FEE = 2.0; // ₦2 Platform Fee

      // Tabbatar cewa wallet yana da akalla ₦2
      if (walletBalance < AUTOMATION_FEE) {
        throw new Error(
          `Insufficient wallet balance. You need at least ₦${AUTOMATION_FEE.toFixed(2)} in your primary wallet for platform gateway charges.`
        );
      }

      console.log(`🚀 [DEVELOPER SIM DISPATCH] Vending ${cleanPlanId} via SIM: ${activeSim.phone}...`);

      try {
        // Tura data kai-tsaye daga SIM dinsa ta MyMTN Web
        const transferRes = await mymtnGateway.transferData({
          recipientPhone: targetRecipient,
          volumeMB: this.extractMBFromPlanId(cleanPlanId),
          pin: "2026",
          gatewayPhone: activeSim.phone,
        });

        // Cire ₦2 a wallet din developer da kuma yin record na transaction
        await prisma.$transaction([
          prisma.wallet.update({
            where: { userId: user.id },
            data: { balance: { decrement: AUTOMATION_FEE } },
          }),
          prisma.transaction.create({
            data: {
              reference: `FEE_${orderRef}`,
              userId: user.id,
              type: "DEBIT",
              service: "GATEWAY_AUTOMATION_FEE",
              amount: AUTOMATION_FEE,
              status: "SUCCESSFUL",
              description: `Platform automation fee (₦2) for ${cleanPlanId} via SIM ${activeSim.phone}`,
            },
          }),
        ]);

        emitEvent("wallet-updated", {
          userId: user.id,
          newBalance: walletBalance - AUTOMATION_FEE,
        });

        return {
          success: true,
          provider: "DEVELOPER_SIM_GATEWAY",
          simUsed: activeSim.phone,
          planId: cleanPlanId,
          feeCharged: AUTOMATION_FEE,
          message: `Data delivered via your linked SIM. Automation fee of ₦2 charged to wallet.`,
          data: transferRes,
        };
      } catch (simError) {
        console.warn(`⚠️ [SIM ERROR on ${activeSim.phone}]:`, simError.message);
        // Gwada wani SIM a cikin pool dinsa idan yana da fiye da SIM 1
        const fallbackCheck = await planSimPoolService.getNextAvailableSimForPlan(cleanPlanId, userId);
        if (fallbackCheck.available && fallbackCheck.sim.phone !== activeSim.phone) {
          console.log(`🔄 Retrying with next active SIM in pool: ${fallbackCheck.sim.phone}`);
          return await this.processDataVending({ recipientPhone, planId, reference, userId, channel });
        }
      }
    }

    // =========================================================================
    // CASE B: SIM YA KARE (FALLBACK ZUWA API MARKETPLACE KAN KUDIN PLAN)
    // =========================================================================
    console.log(`⚡ [FALLBACK TRIGGERED] Developer SIM pool empty for [${cleanPlanId}]. Routing to API Marketplace...`);

    // Nemo farashin wannan Plan ID a cikin Pricing
    const pricing = await prisma.servicePricing.findFirst({
      where: {
        OR: [
          { serviceCode: cleanPlanId },
          { metadata: { path: ["planId"], equals: cleanPlanId } },
          { metadata: { path: ["gatewayPlanId"], equals: cleanPlanId } },
        ],
        enabled: true,
      },
    });

    const planCostPrice = Number(pricing?.costPrice || pricing?.sellingPrice || 400);

    // Tabbatar cewa wallet yana da kudin siyan datan
    if (walletBalance < planCostPrice) {
      throw new Error(
        `Your SIM data is exhausted. API Marketplace fallback requires at least ₦${planCostPrice.toFixed(2)} in your wallet (Current balance: ₦${walletBalance.toFixed(2)}).`
      );
    }

    // Nemi Master SIM a karkashin Admin Marketplace
    const masterPoolCheck = await planSimPoolService.getNextAvailableSimForPlan(cleanPlanId, "admin_master");

    if (!masterPoolCheck.available || !masterPoolCheck.sim) {
      throw new Error(`Data plan [${cleanPlanId}] is currently Out of Stock across both your SIM and API Marketplace.`);
    }

    const masterSim = masterPoolCheck.sim;
    console.log(`🌐 [API MARKETPLACE DISPATCH] Vending ${cleanPlanId} via Master SIM: ${masterSim.phone}...`);

    // Tura data ta hanyar Master Pool
    const masterTransfer = await mymtnGateway.transferData({
      recipientPhone: targetRecipient,
      volumeMB: this.extractMBFromPlanId(cleanPlanId),
      pin: "2026",
      gatewayPhone: masterSim.phone,
    });

    // Cire cikakken kudin Plan din a wallet din developer
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: planCostPrice } },
      }),
      prisma.transaction.create({
        data: {
          reference: `MKT_${orderRef}`,
          userId: user.id,
          type: "DEBIT",
          service: "API_MARKETPLACE_PURCHASE",
          amount: planCostPrice,
          status: "SUCCESSFUL",
          description: `Auto-fallback: Bought ${cleanPlanId} from API Marketplace (₦${planCostPrice})`,
        },
      }),
    ]);

    emitEvent("wallet-updated", {
      userId: user.id,
      newBalance: walletBalance - planCostPrice,
    });

    return {
      success: true,
      provider: "API_MARKETPLACE_MASTER",
      planId: cleanPlanId,
      amountCharged: planCostPrice,
      message: `Your SIM was exhausted. Data successfully vended via API Marketplace (₦${planCostPrice} deducted from wallet).`,
      data: masterTransfer,
    };
  }

  extractMBFromPlanId(planId) {
    const id = String(planId).toLowerCase();
    if (id.includes("500mb")) return 500;
    if (id.includes("1gb")) return 1000;
    if (id.includes("2gb")) return 2000;
    if (id.includes("3gb")) return 3000;
    if (id.includes("5gb")) return 5000;
    if (id.includes("10gb")) return 10000;
    return 1000;
  }
}

module.exports = new GlobalDataDispatcher();