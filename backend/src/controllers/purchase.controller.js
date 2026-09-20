const prisma = require("../config/prisma");
const generateReference = require("../utils/generateReference");
const { emitGatewayCommand, emitEvent } = require("../config/socket");
const axios = require("axios");

const NETWORK_MAP = {
  "1": "MTN",
  "2": "AIRTEL",
  "3": "9MOBILE",
  "4": "GLO",
};

const cleanLocalPhone = (phone = "") => {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 10 && !digits.startsWith("0")) {
    return `0${digits}`;
  }
  return digits;
};

exports.buyApiPlan = async (req, res) => {
  try {
    const {
      planId,
      plan_id,
      planCode,
      network,
      network_id,
      networkId,
      phone,
      phoneNumber,
      ref_id,
      reference: clientRef,
    } = req.body;

    const targetPhone = cleanLocalPhone(phoneNumber || phone || "");
    const resolvedNetworkId = String(
      network_id || networkId || (network === "MTN" ? "1" : network === "AIRTEL" ? "2" : network === "9MOBILE" ? "3" : network === "GLO" ? "4" : "")
    ).trim();

    const lookupPlanCode = String(plan_id || planId || planCode || "").trim();

    if (!targetPhone || targetPhone.length < 10) {
      return res.status(400).json({
        success: false,
        status: "failed",
        code: "VALIDATION_ERROR",
        message: "A valid recipient phone number is required.",
      });
    }

    if (!lookupPlanCode) {
      return res.status(400).json({
        success: false,
        status: "failed",
        code: "VALIDATION_ERROR",
        message: "plan_id or planCode is required.",
      });
    }

    // 1. Resolve Data Plan across Prisma Tables
    let plan = null;

    if (prisma.dataPlan) {
      plan = await prisma.dataPlan.findFirst({
        where: {
          OR: [
            { planId: lookupPlanCode },
            { id: lookupPlanCode },
          ],
          isActive: true,
        },
      });
    }

    if (!plan && prisma.apiPlan) {
      plan = await prisma.apiPlan.findFirst({
        where: {
          OR: [
            { id: lookupPlanCode },
            { code: lookupPlanCode },
            { code: lookupPlanCode.toUpperCase() },
          ],
          status: "ACTIVE",
        },
      });
    }

    if (!plan && prisma.servicePricing) {
      plan = await prisma.servicePricing.findFirst({
        where: {
          OR: [
            { serviceCode: lookupPlanCode },
            { serviceCode: lookupPlanCode.toUpperCase() },
            { id: lookupPlanCode },
          ],
          enabled: true,
        },
      });
    }

    if (!plan && prisma.servicePlan) {
      plan = await prisma.servicePlan.findFirst({
        where: {
          OR: [
            { planCode: lookupPlanCode },
            { id: lookupPlanCode },
          ],
        },
      });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        status: "failed",
        code: "PLAN_NOT_FOUND",
        message: `Active plan matching '${lookupPlanCode}' was not found.`,
      });
    }

    // Extract Plan Specifications
    const meta = plan.metadata && typeof plan.metadata === "object" ? plan.metadata : {};
    const planNetwork = String(
      plan.network || meta.network || NETWORK_MAP[resolvedNetworkId] || NETWORK_MAP[meta.networkId] || "MTN"
    ).toUpperCase().trim();

    const sellingPrice = Number(plan.apiPrice ?? plan.sellingPrice ?? plan.price ?? 0);
    const planName = plan.name || plan.serviceName || `${planNetwork} Data Plan`;
    const gatewayPlanId = meta.gatewayPlanId || plan.gatewayPlanId || lookupPlanCode;

    // 2. Validate User Wallet Balance (Prevent Negative Balances)
    const userId = req.user?.id || req.user?._id || req.apiKeyUser?.id;

    if (userId) {
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
      });

      if (!wallet || Number(wallet.balance) < sellingPrice) {
        return res.status(402).json({
          success: false,
          status: "failed",
          code: "INSUFFICIENT_BALANCE",
          message: `Insufficient wallet balance. Required: ₦${sellingPrice}.`,
          currentBalance: wallet ? Number(wallet.balance) : 0,
          requiredAmount: sellingPrice,
        });
      }
    }

    const reference =
      clientRef ||
      ref_id ||
      (typeof generateReference === "function"
        ? generateReference("DATA")
        : `AYX_DATA_${Date.now()}_${Math.floor(Math.random() * 10000)}`);

    // 3. Extract Bundle Size for USSD Delivery
    let raw = String(meta.dataSize || meta.volume || plan.volume || lookupPlanCode).toUpperCase();
    let numericSize = "1000";

    if (raw.includes("500")) {
      numericSize = "500";
    } else if (raw.includes("2GB") || raw.includes("2000")) {
      numericSize = "2000";
    } else if (raw.includes("3GB") || raw.includes("3000")) {
      numericSize = "3000";
    } else if (raw.includes("5GB") || raw.includes("5000")) {
      numericSize = "5000";
    } else if (raw.includes("10GB") || raw.includes("10000")) {
      numericSize = "10000";
    } else {
      numericSize = raw.replace(/[^0-9]/g, "") || "1000";
    }

    // 4. Atomic Debit & Database Records
    const result = await prisma.$transaction(async (tx) => {
      let updatedWallet = null;

      if (userId) {
        const currentWallet = await tx.wallet.findUnique({
          where: { userId },
        });

        if (!currentWallet || currentWallet.balance < sellingPrice) {
          throw new Error(`Insufficient wallet balance. Required: ₦${sellingPrice}`);
        }

        const balanceBefore = Number(currentWallet.balance);
        const balanceAfter = balanceBefore - sellingPrice;

        updatedWallet = await tx.wallet.update({
          where: { userId },
          data: { balance: balanceAfter },
        });

        if (tx.walletLedger) {
          await tx.walletLedger.create({
            data: {
              userId,
              reference,
              type: "DEBIT",
              amount: sellingPrice,
              balanceBefore,
              balanceAfter,
              module: "DATA",
              description: `${planName} purchase for ${targetPhone}`,
            },
          });
        }
      }

      const transaction = await tx.transaction.create({
        data: {
          reference,
          userId: userId || "DIRECT_API",
          type: "DEBIT",
          service: `${planNetwork} DATA`,
          amount: sellingPrice,
          status: "PROCESSING",
          description: `${planName} for ${targetPhone}`,
        },
      });

      return { updatedWallet, transaction };
    });

    if (userId && result.updatedWallet) {
      emitEvent("wallet-updated", {
        userId,
        wallet: result.updatedWallet,
      });
    }

    // =========================================================================
    // STEP 1: STRICT GATEWAY SIM MATCHING (PREVENTS CROSS-PLAN DISPENSING)
    // =========================================================================
    let activeDevice = null;
    let targetSim = null;

    try {
      const onlineDevices = await prisma.gsmDevice.findMany({
        where: {
          status: "ONLINE",
          lastSeen: { gte: new Date(Date.now() - 3 * 60 * 1000) },
        },
        include: {
          sims: {
            where: {
              status: "ACTIVE",
            },
          },
        },
        orderBy: { lastSeen: "desc" },
      });

      for (const device of onlineDevices) {
        for (const sim of device.sims) {
          const simCarrier = String(sim.carrierName || sim.displayName || "").toUpperCase();
          if (!simCarrier.includes(planNetwork)) continue;

          // Check batch validity / Expiry check
          if (sim.expiryDate && new Date() > new Date(sim.expiryDate)) {
            continue;
          }

          // Check if SIM supports the specific plan_id
          const hasPlan = Array.isArray(sim.supportedPlans) && sim.supportedPlans.includes(lookupPlanCode);
          if (!hasPlan) continue;

          // Check remaining stock for this specific plan_id
          const balances = sim.planBalances && typeof sim.planBalances === "object" ? sim.planBalances : {};
          const remainingStock = balances[lookupPlanCode] !== undefined ? Number(balances[lookupPlanCode]) : 1;

          if (remainingStock > 0) {
            targetSim = sim;
            activeDevice = device;
            break;
          }
        }
        if (targetSim) break;
      }

      if (activeDevice && targetSim) {
        const slotIndex = Number(targetSim.slotIndex ?? 0);
        const gsmPin = process.env.GSM_DATA_PIN || "1997";

        let ussdCode = `*312*${targetPhone}*${numericSize}*${gsmPin}#`;
        let steps = [targetPhone, numericSize, gsmPin];

        if (meta.ussdCode || plan.ussdCode) {
          ussdCode = String(meta.ussdCode || plan.ussdCode)
            .replace(/{phone}/g, targetPhone)
            .replace(/{amount}/g, sellingPrice)
            .replace(/{volume}/g, numericSize);
        }

        const commandPayload = {
          reference,
          commandId: reference,
          id: reference,
          deviceId: activeDevice.id,
          type: "USSD",
          action: "SEND_USSD",
          service: "DATA",
          ussdCode,
          code: ussdCode,
          steps,
          phoneNumber: targetPhone,
          targetPhone,
          slotIndex,
          simSlot: slotIndex,
          amount: sellingPrice,
          network: planNetwork,
          planId: lookupPlanCode,
        };

        // Ajiye umarni a database
        await prisma.gsmCommand.create({
          data: {
            reference,
            deviceId: activeDevice.id,
            type: "USSD",
            status: "PENDING",
            payload: commandPayload,
          },
        }).catch(() => null);

        // Rage adadin wannan plan din a SIM
        const balances = targetSim.planBalances && typeof targetSim.planBalances === "object" ? { ...targetSim.planBalances } : {};
        const currentStock = balances[lookupPlanCode] !== undefined ? Number(balances[lookupPlanCode]) : 1;
        balances[lookupPlanCode] = Math.max(0, currentStock - 1);

        await prisma.gsmSim.update({
          where: { id: targetSim.id },
          data: { planBalances: balances },
        }).catch(() => null);

        // =========================================================================
        // GYARA: TURA UMARNI SAU DAYA TAK TA SOCKET GUDA DAYA
        // =========================================================================
        if (typeof emitGatewayCommand === "function") {
          emitGatewayCommand(activeDevice.id, commandPayload);
        } else {
          emitEvent("gateway-command", commandPayload, activeDevice.id);
        }

        return res.status(200).json({
          success: true,
          status: "success",
          route: "OUR_GATEWAY",
          message: `${planName} dispatched to GSM Gateway modem for ${targetPhone}.`,
          reference,
          data: {
            network: planNetwork,
            phone: targetPhone,
            plan_id: lookupPlanCode,
            planName,
            amount: sellingPrice,
            simSlot: slotIndex,
            deviceId: activeDevice.id,
          },
        });
      } else {
        console.warn(`[STRICT ROUTE]: Plan ${lookupPlanCode} exhausted or not mapped on any active modem. Routing to external fallback...`);
      }
    } catch (gsmErr) {
      console.warn("Primary local modem route notice:", gsmErr.message);
    }

    // =========================================================================
    // STEP 2: FALLBACK TO EXTERNAL VTU API (UPSTREAM DISPATCH)
    // =========================================================================
    try {
      const upstreamUrl = process.env.AYAX_API_URL || "https://api.ayaxdata.com/api/v1";
      const upstreamKey = process.env.AYAX_API_KEY;

      const response = await axios.post(
        `${upstreamUrl}/data/purchase`,
        {
          network: planNetwork,
          network_id: resolvedNetworkId || (planNetwork === "MTN" ? "1" : "2"),
          phone: targetPhone,
          planCode: gatewayPlanId,
          plan_id: gatewayPlanId,
          amount: sellingPrice,
          reference,
        },
        {
          headers: {
            Authorization: `Bearer ${upstreamKey}`,
            "Content-Type": "application/json",
          },
          timeout: 40000,
        }
      );

      if (response.data?.success || response.data?.status === "success") {
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESSFUL" },
        });

        return res.status(200).json({
          success: true,
          status: "success",
          route: "UPSTREAM_API",
          message: `${planName} successfully delivered to ${targetPhone}.`,
          reference,
          data: {
            network: planNetwork,
            phone: targetPhone,
            plan_id: lookupPlanCode,
            planName,
            amount: sellingPrice,
            apiResponse: response.data,
          },
        });
      } else {
        throw new Error(response.data?.message || "Upstream partner delivery rejected");
      }
    } catch (apiErr) {
      console.error("Upstream fallback failed, executing auto-refund:", apiErr.message);

      // =========================================================================
      // STEP 3: AUTO-REFUND ON TOTAL FAILURE
      // =========================================================================
      if (userId) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { userId },
            data: { balance: { increment: sellingPrice } },
          }),
          prisma.transaction.updateMany({
            where: { reference },
            data: {
              status: "FAILED",
              description: `FAILED: ${planName} to ${targetPhone} (Refunded ₦${sellingPrice})`,
            },
          }),
        ]);
      }

      return res.status(502).json({
        success: false,
        status: "failed",
        code: "GATEWAY_EXHAUSTED",
        message: `Data delivery failed across local gateway and upstream providers. ₦${sellingPrice} has been refunded to your wallet.`,
      });
    }
  } catch (error) {
    console.error("buyApiPlan Error:", error);
    return res.status(500).json({
      success: false,
      status: "error",
      message: error.message || "Internal server error during data plan purchase.",
    });
  }
};