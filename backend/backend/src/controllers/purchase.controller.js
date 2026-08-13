const prisma = require("../config/prisma");
const generateReference = require("../utils/generateReference");
const { findBestSim, debitSimBalance } = require("../services/gsm.service");
const { emitEvent } = require("../config/socket");
exports.buyApiPlan = async (req, res) => {
  try {
    const { planId, phone } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    const plan = await prisma.apiPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.status !== "ACTIVE") {
      return res.status(404).json({
        success: false,
        message: "Plan not found or disabled",
      });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
    });

    if (!wallet || wallet.balance < plan.sellingPrice) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    const sim = await findBestSim({
      type: plan.category === "DATA" ? "DATA" : "VTU",
      network: plan.provider,
      minBalance: plan.costPrice,
    });

    if (!sim) {
      return res.status(404).json({
        success: false,
        message: "No available GSM SIM for this provider and plan",
      });
    }

    const reference = generateReference("BUY");

    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId: req.user.id },
        data: {
          balance: {
            decrement: plan.sellingPrice,
          },
        },
      });

      const updatedSim = await tx.gsmSim.update({
        where: { id: sim.id },
        data: {
          balance: {
            decrement: plan.costPrice,
          },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference,
          userId: req.user.id,
          type: "DEBIT",
          service: plan.category,
          amount: plan.sellingPrice,
          status: "SUCCESSFUL",
          description: `${plan.name} purchase for ${phone || "N/A"} using SIM ${sim.slot}`,
        },
      });

      return {
        wallet: updatedWallet,
        sim: updatedSim,
        transaction,
        plan,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Plan purchased successfully via GSM Gateway",
      result,
    });
    await createAuditLog({
  user: req.user,
  action: "BUY_PLAN",
  module: "PURCHASE",
  description: `${plan.name} purchased`,
  ip: req.ip,
});
emitEvent("purchase-successful", {
  message: "New purchase completed",
  result,
});
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


