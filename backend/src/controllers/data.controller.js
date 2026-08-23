const prisma = require("../lib/prisma");
const axios = require("axios");
const { emitEvent, emitGatewayCommand } = require("../config/socket");

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

    const resolvedNetwork = String(network).toUpperCase().trim();
    const targetPhone = String(phone).trim();

    // 1. Idempotency Check
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
        planCode: String(planCode).trim(),
        network: resolvedNetwork,
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

    // 3. Verify Wallet Balance
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

    // 4. Locate Active GSM Gateway Device
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

    // 5. Select Correct SIM for the Network
    const targetSim =
      activeDevice.sims.find(
        (s) =>
          s.carrierName?.toUpperCase().includes(resolvedNetwork) ||
          s.displayName?.toUpperCase().includes(resolvedNetwork)
      ) || activeDevice.sims[0];

    const slotIndex = targetSim?.slotIndex ?? 0;
    const txReference = reference || `AYAX_DATA_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 6. Debit Wallet & Create Pending Transaction
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
            network: resolvedNetwork,
            phone: targetPhone,
            planCode: plan.planCode,
            volume: plan.volume,
            deviceId: activeDevice.id,
            simId: targetSim?.id || null,
          },
        },
      });

      return { updatedWallet: newWallet, transaction: newTx };
    });

    // 7. Format USSD Syntax
    let ussdCode = `*312*${targetPhone}*${plan.planCode}*1997#`;
    let steps = [targetPhone, plan.planCode, "1997"];

    if (resolvedNetwork === "AIRTEL") {
      ussdCode = `*141*${targetPhone}*${plan.planCode}#`;
      steps = [targetPhone, plan.planCode];
    } else if (resolvedNetwork === "GLO") {
      ussdCode = `*127*${plan.planCode}*${targetPhone}#`;
      steps = [plan.planCode, targetPhone];
    } else if (resolvedNetwork === "9MOBILE") {
      ussdCode = `*229*${plan.planCode}*${targetPhone}#`;
      steps = [plan.planCode, targetPhone];
    }

    const commandPayload = {
      reference: txReference,
      deviceId: activeDevice.id,
      type: "BUY_DATA", // daidai da format na BUY_AIRTIME
      service: "DATA",
      balanceType: "DATA",
      ussdCode,
      ussd: ussdCode,
      code: ussdCode,
      steps,
      phoneNumber: targetPhone,
      phone: targetPhone,
      targetPhone: targetPhone,
      slotIndex,
      simSlot: slotIndex,
      simId: targetSim?.id || null,
      amount: cost,
      network: resolvedNetwork,
      planCode: plan.planCode,
    };

    // 8. Store Command in gsmCommand Table
    const createdCommand = await prisma.gsmCommand.create({
      data: {
        reference: txReference,
        deviceId: activeDevice.id,
        type: "BUY_DATA",
        status: "PENDING",
        payload: commandPayload,
      },
    });

    // 9. Dispatch to Device across ALL Socket Channels (Same method as Airtime)
    const eventPayload = {
      commandId: createdCommand.id,
      id: createdCommand.id,
      reference: txReference,
      type: "BUY_DATA",
      payload: commandPayload,
      ussdCode,
      code: ussdCode,
      steps,
      phoneNumber: targetPhone,
      slotIndex,
      simSlot: slotIndex,
      carrier: targetSim?.carrierName || resolvedNetwork,
    };

    try {
      emitEvent("gateway-command", eventPayload, activeDevice.id);
      emitEvent("command", eventPayload, activeDevice.id);
      emitEvent(`gateway-command-${activeDevice.id}`, eventPayload);

      if (typeof emitGatewayCommand === "function") {
        emitGatewayCommand(activeDevice.id, eventPayload);
      }

      console.log(`⚡ [DATA DISPATCHED] Ref: ${txReference} -> Device: ${activeDevice.id} (Slot: ${slotIndex}) Code: ${ussdCode}`);
    } catch (socketErr) {
      console.warn("Socket emission error:", socketErr.message);
    }

    return res.status(200).json({
      status: "success",
      code: "TRANSACTION_QUEUED",
      message: `Data purchase initiated for ${plan.name} to ${targetPhone}. Dispatched to GSM Gateway.`,
      data: {
        reference: txReference,
        network: plan.network,
        phone: targetPhone,
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