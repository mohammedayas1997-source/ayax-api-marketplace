const prisma = require("../config/prisma");
const { emitEvent, emitGatewayCommand } = require("../config/socket");

/* ======================================================
   1. GET AVAILABLE DATA PLANS & MARKETPLACE PRICING
====================================================== */
exports.getDataPlans = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const userTier = String(user?.tier || (user?.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();
    const { network } = req.query;

    const whereClause = {
      category: "DATA",
      enabled: true,
      tier: userTier,
    };

    if (network) {
      whereClause.OR = [
        { serviceCode: { contains: String(network).toUpperCase() } },
        { serviceName: { contains: String(network), mode: "insensitive" } },
      ];
    }

    const plans = await prisma.servicePricing.findMany({
      where: whereClause,
      select: {
        id: true,
        serviceCode: true,
        serviceName: true,
        category: true,
        tier: true,
        dataType: true,
        dataSize: true,
        validity: true,
        validityDays: true,
        sellingPrice: true,
        currency: true,
        features: true,
      },
      orderBy: {
        sellingPrice: "asc",
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Data plans retrieved successfully.",
      tier: userTier,
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
   2. UNIVERSAL DATA PURCHASE WITH EXPIRY & WALLET DEBIT
====================================================== */
exports.purchaseData = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const {
      network,
      phone,
      phoneNumber,
      planCode,
      planSize,
      serviceCode,
      reference,
    } = req.body;

    const targetPhone = String(phoneNumber || phone || "").trim();
    const resolvedNetwork = String(network || "MTN").toUpperCase().trim();
    const targetCode = String(serviceCode || planCode || planSize || "").trim();

    if (!targetPhone || targetPhone.length < 10) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "A valid recipient phone number is required.",
      });
    }

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required to purchase data.",
      });
    }

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    // 1. Nemo Tsarin Plan daga ServicePricing
    let pricingPlan = await prisma.servicePricing.findFirst({
      where: {
        category: "DATA",
        enabled: true,
        tier: userTier,
        OR: [
          { serviceCode: targetCode },
          { serviceCode: { contains: targetCode } },
          { serviceName: { contains: targetCode, mode: "insensitive" } },
        ],
      },
    });

    if (!pricingPlan) {
      return res.status(404).json({
        status: "error",
        code: "PLAN_NOT_FOUND",
        message: `Active data plan matching '${targetCode}' was not found for tier '${userTier}'.`,
      });
    }

    const cost = Number(pricingPlan.sellingPrice);
    const planName = pricingPlan.serviceName;
    const validityDays = pricingPlan.validityDays || 30;

    // 2. Lissafa Ranar Karewar Data (Expiry Date)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + validityDays);

    // 3. Tabbatar da Kudin Wallet (Debit Validation)
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient wallet balance to purchase this plan.",
        currentBalance: wallet ? Number(wallet.balance) : 0,
        requiredAmount: cost,
      });
    }

    // 4. Nemo Active GSM Device
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
        (s) =>
          s.carrierName?.toUpperCase().includes(resolvedNetwork) ||
          s.displayName?.toUpperCase().includes(resolvedNetwork)
      ) || activeDevice.sims[0];

    const slotIndex = targetSim?.slotIndex ?? 1;

    // 5. Tace MB don USSD Template
    const numericMB =
      pricingPlan.dataSize?.replace(/[^0-9]/g, "") ||
      (targetCode.match(/\d+/) ? targetCode.match(/\d+/)[0] : "1000");

    // 6. Dynamic Universal Multi-Plan USSD Router
    const pin = "1997";
    let ussdCode = "";
    let steps = [];

    const planIdentifier = `${pricingPlan.serviceCode} ${planName}`.toUpperCase();

    if (resolvedNetwork === "MTN") {
      if (planIdentifier.includes("SME")) {
        ussdCode = `*461*1*${targetPhone}*${numericMB}*${pin}#`;
        steps = ["1", targetPhone, numericMB, pin];
      } else if (planIdentifier.includes("CG") || planIdentifier.includes("CORP")) {
        ussdCode = `*460*6*1*${targetPhone}*${numericMB}*${pin}#`;
        steps = ["6", "1", targetPhone, numericMB, pin];
      } else {
        ussdCode = `*312*${targetPhone}*${numericMB}*${pin}#`;
        steps = [targetPhone, numericMB, pin];
      }
    } else if (resolvedNetwork === "AIRTEL") {
      ussdCode = `*141*${targetPhone}*${numericMB}#`;
      steps = [targetPhone, numericMB];
    } else if (resolvedNetwork === "GLO") {
      ussdCode = `*127*${numericMB}*${targetPhone}#`;
      steps = [numericMB, targetPhone];
    } else if (resolvedNetwork === "9MOBILE") {
      ussdCode = `*229*${numericMB}*${targetPhone}#`;
      steps = [numericMB, targetPhone];
    }

    const txReference = reference || `AYAX_DATA_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // 7. Cire Kudin Wallet da Bude Transaction (Prisma Transaction)
    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: cost } },
      });

      const newTx = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEBIT",
          service: `${resolvedNetwork} DATA`,
          amount: cost,
          status: "PENDING",
          reference: txReference,
          description: `${planName} to ${targetPhone} (Expires: ${expiryDate.toDateString()})`,
        },
      });

      return { updatedWallet: newWallet, transaction: newTx };
    });

    const commandPayload = {
      reference: txReference,
      deviceId: activeDevice.id,
      type: "USSD",
      service: "DATA",
      ussdCode,
      steps,
      phone: targetPhone,
      slotIndex: Number(slotIndex),
      amount: cost,
      network: resolvedNetwork,
      expiryDate: expiryDate.toISOString(),
    };

    // 8. Tura GSM Command
    const createdCommand = await prisma.gsmCommand.create({
      data: {
        reference: txReference,
        deviceId: activeDevice.id,
        type: "USSD",
        status: "PENDING",
        payload: commandPayload,
      },
    }).catch(() => null);

    const eventPayload = {
      commandId: createdCommand ? createdCommand.id : txReference,
      reference: txReference,
      type: "USSD",
      payload: commandPayload,
      ussdCode,
      steps,
      phoneNumber: targetPhone,
      slotIndex: Number(slotIndex),
      carrier: targetSim?.carrierName || resolvedNetwork,
    };

    try {
      emitEvent("gateway-command", eventPayload, activeDevice.id);
      if (typeof emitGatewayCommand === "function") {
        emitGatewayCommand(activeDevice.id, eventPayload);
      }
    } catch (socketErr) {
      console.warn("Socket emission error:", socketErr.message);
    }

    return res.status(200).json({
      status: "success",
      code: "TRANSACTION_QUEUED",
      message: `Data purchase queued for ${planName} to ${targetPhone}.`,
      data: {
        reference: txReference,
        network: resolvedNetwork,
        phone: targetPhone,
        plan: planName,
        validity: `${validityDays} Days`,
        expiryDate: expiryDate.toISOString(),
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
   3. QUERY TRANSACTION STATUS
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
        service: transaction.service,
        amount: transaction.amount,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("Check data status error:", error);
    return res.status(500).json({
      status: "error",
      code: "SERVER_ERROR",
      message: "Unable to query transaction status.",
    });
  }
};