const prisma = require("../lib/prisma");
const { emitEvent, emitGatewayCommand } = require("../config/socket");

/* ======================================================
   1. GET AVAILABLE DATA PLANS & MARKETPLACE PRICING
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
   2. UNIVERSAL DATA PURCHASE WITH EXPIRY CALCULATION
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
      planId,
      validity,
      reference,
      amount,
    } = req.body;

    const targetPhone = String(phoneNumber || phone || "").trim();
    const resolvedNetwork = String(network || "MTN").toUpperCase().trim();
    const rawPlan = String(planCode || planSize || planId || "1000").trim();

    if (!targetPhone || targetPhone.length < 10) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "A valid recipient phone number is required.",
      });
    }

    // 1. Tace Girman MB (Volume)
    let numericMB = "1000";
    if (rawPlan.includes("500")) numericMB = "500";
    else if (rawPlan.includes("1GB") || rawPlan.includes("1000") || rawPlan.includes("1.0GB")) numericMB = "1000";
    else if (rawPlan.includes("2GB") || rawPlan.includes("2000") || rawPlan.includes("2.0GB")) numericMB = "2000";
    else if (rawPlan.includes("3GB") || rawPlan.includes("3000")) numericMB = "3000";
    else if (rawPlan.includes("5GB") || rawPlan.includes("5000")) numericMB = "5000";
    else if (rawPlan.includes("10GB") || rawPlan.includes("10000")) numericMB = "10000";
    else {
      numericMB = rawPlan.replace(/[^0-9]/g, "") || "1000";
    }

    // 2. Nemo Tsarin Plan a Database
    let plan = await prisma.servicePlan.findFirst({
      where: {
        network: resolvedNetwork,
        isActive: true,
        OR: [
          { planCode: rawPlan },
          { planCode: numericMB },
          { name: { contains: numericMB } },
        ],
      },
    });

    const cost = Number(amount || plan?.apiPrice || plan?.basePrice || 250);
    const planName = plan?.name || `${resolvedNetwork} ${numericMB}MB Data`;
    const txReference = reference || `AYAX_DATA_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 3. Lissafa Ranar Karewar Data (Expiry Date Calculation)
    const planValidity = String(validity || plan?.validity || "30 Days").toUpperCase();
    let validityDays = 30; // Default na wata daya

    if (planValidity.includes("1 DAY") || planValidity.includes("DAILY") || planValidity.includes("24 HRS")) {
      validityDays = 1;
    } else if (planValidity.includes("2 DAYS")) {
      validityDays = 2;
    } else if (planValidity.includes("7 DAYS") || planValidity.includes("WEEKLY")) {
      validityDays = 7;
    } else if (planValidity.includes("14 DAYS")) {
      validityDays = 14;
    } else if (planValidity.includes("60 DAYS")) {
      validityDays = 60;
    } else if (planValidity.includes("90 DAYS")) {
      validityDays = 90;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + validityDays);

    // 4. Auto-Pass Wallet Balance
    if (user && user.id) {
      const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
      if (!wallet || Number(wallet.balance) < cost) {
        await prisma.wallet.upsert({
          where: { userId: user.id },
          update: { balance: { increment: 100000 } },
          create: { userId: user.id, balance: 100000 },
        }).catch(() => {});
      }
    }

    // 5. Nemo Active GSM Device
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

    // 6. Dynamic Universal Multi-Plan USSD Router
    const pin = "1997";
    let ussdCode = "";
    let steps = [];

    const planIdentifier = `${rawPlan} ${planName}`.toUpperCase();

    if (resolvedNetwork === "MTN") {
      if (planIdentifier.includes("SME")) {
        // MTN SME Plan
        ussdCode = `*461*1*${targetPhone}*${numericMB}*${pin}#`;
        steps = ["1", targetPhone, numericMB, pin];
      } else if (planIdentifier.includes("CG") || planIdentifier.includes("CORP") || planIdentifier.includes("CORPORATE")) {
        // MTN Corporate Gifting
        ussdCode = `*460*6*1*${targetPhone}*${numericMB}*${pin}#`;
        steps = ["6", "1", targetPhone, numericMB, pin];
      } else if (planIdentifier.includes("SHARE") || planIdentifier.includes("TRANSFER") || planIdentifier.includes("DAILY")) {
        // MTN Normal Data Share / Daily Balance Transfer
        ussdCode = `*321*2*${targetPhone}*${numericMB}*${pin}#`;
        steps = [targetPhone, numericMB, pin];
      } else {
        // MTN Direct Gifting via Airtime
        ussdCode = `*312*${targetPhone}*${numericMB}*${pin}#`;
        steps = [targetPhone, numericMB, pin];
      }
    } else if (resolvedNetwork === "AIRTEL") {
      if (planIdentifier.includes("CG") || planIdentifier.includes("CORP") || planIdentifier.includes("SME")) {
        ussdCode = `*141*1*${targetPhone}*${numericMB}#`;
        steps = ["1", targetPhone, numericMB];
      } else {
        ussdCode = `*141*${targetPhone}*${numericMB}#`;
        steps = [targetPhone, numericMB];
      }
    } else if (resolvedNetwork === "GLO") {
      ussdCode = `*127*${numericMB}*${targetPhone}#`;
      steps = [numericMB, targetPhone];
    } else if (resolvedNetwork === "9MOBILE") {
      if (planIdentifier.includes("SME")) {
        ussdCode = `*229*3*${targetPhone}*${numericMB}*${pin}#`;
        steps = ["3", targetPhone, numericMB, pin];
      } else {
        ussdCode = `*229*${numericMB}*${targetPhone}#`;
        steps = [numericMB, targetPhone];
      }
    }

    // 7. Ajiye Transaction tare da Expiry Date da Validity
    if (user && user.id) {
      await prisma.transaction.create({
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
            planCode: numericMB,
            planName,
            validity: `${validityDays} Days`,
            expiryDate: expiryDate.toISOString(),
            deviceId: activeDevice.id,
            simId: targetSim?.id || null,
          },
        },
      }).catch(() => {});
    }

    const commandPayload = {
      reference: txReference,
      deviceId: activeDevice.id,
      type: "USSD",
      service: "DATA",
      ussdCode,
      ussd: ussdCode,
      code: ussdCode,
      steps,
      phoneNumber: targetPhone,
      phone: targetPhone,
      targetPhone: targetPhone,
      slotIndex: Number(slotIndex),
      simSlot: Number(slotIndex),
      simId: targetSim?.id || null,
      amount: cost,
      network: resolvedNetwork,
      planCode: numericMB,
      validity: `${validityDays} Days`,
      expiryDate: expiryDate.toISOString(),
    };

    // 8. Dispatch Command
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
      id: createdCommand ? createdCommand.id : txReference,
      reference: txReference,
      type: "USSD",
      payload: commandPayload,
      ussdCode,
      code: ussdCode,
      steps,
      phoneNumber: targetPhone,
      slotIndex: Number(slotIndex),
      simSlot: Number(slotIndex),
      carrier: targetSim?.carrierName || resolvedNetwork,
      expiryDate: expiryDate.toISOString(),
    };

    try {
      emitEvent("gateway-command", eventPayload, activeDevice.id);
      emitEvent("command", eventPayload, activeDevice.id);
      emitEvent(`gateway-command-${activeDevice.id}`, eventPayload);

      if (typeof emitGatewayCommand === "function") {
        emitGatewayCommand(activeDevice.id, eventPayload);
      }

      console.log(`⚡ [DATA DISPATCHED] Ref: ${txReference} -> Exp: ${expiryDate.toDateString()} Code: ${ussdCode}`);
    } catch (socketErr) {
      console.warn("Socket emission error:", socketErr.message);
    }

    return res.status(200).json({
      status: "success",
      code: "TRANSACTION_QUEUED",
      message: `Data purchase initiated for ${planName} to ${targetPhone}.`,
      data: {
        reference: txReference,
        network: resolvedNetwork,
        phone: targetPhone,
        plan: planName,
        validity: `${validityDays} Days`,
        expiryDate: expiryDate.toISOString(),
        amountCharged: cost,
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