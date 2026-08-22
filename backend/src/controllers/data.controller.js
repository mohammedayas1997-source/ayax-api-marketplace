const prisma = require("../lib/prisma");
const axios = require("axios");
const { emitGatewayCommand } = require("../config/socket");

/* ======================================================
   1. GET AVAILABLE DATA PLANS & MARKETPLACE PRICING

   GET /api/v1/data/plans
   Headers: { "x-api-key": "ayax_live_..." } or Bearer Token
====================================================== */
exports.getDataPlans = async (req, res) => {
  try {
    const { network } = req.query;

    const whereClause = {
      type: "DATA",
      isActive: true,
    };

    if (network) {
      whereClause.network = String(network).toUpperCase();
    }

    const plans = await prisma.servicePlan.findMany({
      where: whereClause,
      select: {
        id: true,
        planCode: true,
        name: true,
        network: true,
        volume: true,
        validity: true,
        basePrice: true,
        apiPrice: true,
        isActive: true,
      },
      orderBy: {
        apiPrice: "asc",
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Data plans retrieved successfully.",
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    console.error("Get marketplace data plans error:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve data plans.",
      error: error.message,
    });
  }
};

/* ======================================================
   2. PURCHASE / DISPATCH DATA VIA GSM GATEWAY

   POST /api/v1/data/purchase
   Headers: { "x-api-key": "ayax_live_..." }
   Body: { network, phone, planCode, reference }
====================================================== */
exports.purchaseData = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const { network, phone, planCode, reference } = req.body;

    if (!network || !phone || !planCode) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "network, phone number, and planCode are required.",
      });
    }

    // 1. Idempotency Check (Prevent Duplicate Operations)
    if (reference) {
      const existingTx = await prisma.transaction.findUnique({
        where: { reference },
      });

      if (existingTx) {
        return res.status(409).json({
          status: "error",
          code: "DUPLICATE_REFERENCE",
          message: "A transaction with this reference has already been processed.",
          transaction: existingTx,
        });
      }
    }

    // 2. Fetch Matching Service Plan
    const plan = await prisma.servicePlan.findFirst({
      where: {
        planCode,
        network: String(network).toUpperCase(),
        isActive: true,
      },
    });

    if (!plan) {
      return res.status(404).json({
        status: "error",
        code: "PLAN_NOT_FOUND",
        message: `Plan with code '${planCode}' not found for network ${network}.`,
      });
    }

    const cost = Number(plan.apiPrice || plan.basePrice);

    // 3. Verify Developer/User Wallet Balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient wallet balance. Please fund your account wallet.",
        currentBalance: wallet ? Number(wallet.balance) : 0,
        requiredAmount: cost,
      });
    }

    // 4. Locate Active GSM Gateway Device and Compatible SIM Slot
    const activeDevice = await prisma.gsmDevice.findFirst({
      where: { status: "ONLINE" },
      include: { sims: true },
      orderBy: { lastSeen: "desc" },
    });

    if (!activeDevice) {
      return res.status(503).json({
        status: "error",
        code: "NO_GATEWAY_ONLINE",
        message: "All GSM Gateway lines are currently offline. Please retry shortly.",
      });
    }

    const targetSim =
      activeDevice.sims.find(
        (s) => s.network?.toUpperCase() === String(network).toUpperCase()
      ) || activeDevice.sims[0];

    const txReference =
      reference || `AYAX_DATA_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 5. Debit Wallet and Create PENDING Transaction Record
    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: {
          balance: { decrement: cost },
        },
      });

      const newTx = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DATA_PURCHASE",
          amount: cost,
          status: "PENDING",
          reference: txReference,
          metadata: {
            platform: "ayax_marketplace",
            network: String(network).toUpperCase(),
            phone,
            planCode,
            volume: plan.volume,
            deviceId: activeDevice.id,
            simId: targetSim?.id,
          },
        },
      });

      return { updatedWallet: newWallet, transaction: newTx };
    });

    // 6. Build Standard USSD Syntax
    const ussdSyntax = `*312*${phone.trim()}*${plan.planCode}#`;

    const commandPayload = {
      reference: txReference,
      deviceId: activeDevice.id,
      type: "USSD",
      ussdCode: ussdSyntax,
      code: ussdSyntax,
      slotIndex: targetSim?.slotIndex ?? 0,
      simSlot: targetSim?.slotIndex ?? 0,
      simId: targetSim?.id || null,
      phoneNumber: phone.trim(),
      amount: cost,
      network: String(network).toUpperCase(),
      planCode: plan.planCode,
    };

    // 7. Store Command in gsmCommand Table for GSM Execution
    await prisma.gsmCommand.create({
      data: {
        reference: txReference,
        deviceId: activeDevice.id,
        type: "USSD",
        status: "PENDING",
        payload: commandPayload,
      },
    });

    // 8. Real-time Dispatch to GSM Device via Socket.io
    emitGatewayCommand(activeDevice.id, {
      id: transaction.id,
      ...commandPayload,
    });

    console.log(
      `[GSM DISPATCH] Queued Ref: ${txReference} for device ${activeDevice.id} (Slot: ${commandPayload.slotIndex})`
    );

    return res.status(200).json({
      status: "success",
      code: "TRANSACTION_QUEUED",
      message: `Data purchase initiated for ${plan.name} to ${phone}. Processing on GSM Gateway.`,
      data: {
        reference: txReference,
        network: plan.network,
        phone,
        plan: plan.name,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    console.error("Marketplace data purchase error:", error);
    return res.status(500).json({
      status: "error",
      code: "SERVER_ERROR",
      message: "An error occurred while processing the API request.",
      error: error.message,
    });
  }
};

/* ======================================================
   3. QUERY TRANSACTION STATUS (B2B STATUS CHECK)

   GET /api/v1/data/status/:reference
====================================================== */
exports.checkDataStatus = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const { reference } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        reference,
        userId: user.id,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        status: "error",
        code: "TRANSACTION_NOT_FOUND",
        message: `No transaction found with reference '${reference}'.`,
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        reference: transaction.reference,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("Check data status error:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to query transaction status.",
    });
  }
};