const prisma = require("../config/prisma");
const { emitEvent, emitGatewayCommand } = require("../config/socket");
const axios = require("axios");

// Helper na tsaftace lambar waya zuwa 080...
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

// Helper: Duba balance na Providers a lokacin da bukata ta taso
const getProviderBalances = async () => {
  const balances = {
    BILALSADA: 0,
    VTPASS: 0,
    SMARTSMS: 0,
  };

  if (process.env.BILALSADA_API_TOKEN) {
    try {
      const res = await axios.get("https://bilalsadasub.com/api/user", {
        headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
        timeout: 4000,
      });
      balances.BILALSADA = Number(res.data?.user?.wallet_balance || res.data?.wallet || 0);
    } catch (_) {
      balances.BILALSADA = 0;
    }
  }

  if (process.env.VTPASS_API_KEY && process.env.VTPASS_SECRET_KEY) {
    try {
      const res = await axios.get("https://api-service.vtpass.com/api/balance", {
        headers: {
          "api-key": process.env.VTPASS_API_KEY,
          "secret-key": process.env.VTPASS_SECRET_KEY,
        },
        timeout: 4000,
      });
      balances.VTPASS = Number(res.data?.contents?.balance || 0);
    } catch (_) {
      balances.VTPASS = 0;
    }
  }

  if (process.env.SMARTSMS_API_TOKEN) {
    try {
      const res = await axios.get(
        `https://smartsmssolutions.com/api/json.php?token=${process.env.SMARTSMS_API_TOKEN}&type=balance`,
        { timeout: 4000 }
      );
      balances.SMARTSMS = Number(res.data?.balance || 0);
    } catch (_) {
      balances.SMARTSMS = 0;
    }
  }

  return balances;
};

// Helper: Tura Data ta hanyar API da aka zaba
const dispatchDataAPI = async ({ provider, network, phone, planCode, numericMB, reference }) => {
  const normNet = network.toUpperCase();

  if (provider === "BILALSADA") {
    const netMap = { MTN: 1, GLO: 2, "9MOBILE": 3, AIRTEL: 4 };
    const res = await axios.post(
      "https://bilalsadasub.com/api/data",
      {
        network: netMap[normNet] || 1,
        phone,
        plan: Number(planCode || numericMB),
        "request-id": reference,
      },
      {
        headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
        timeout: 35000,
      }
    );
    if (res.data?.status === "success" || res.data?.status === "process") {
      return { success: true, provider: "BILALSADA", raw: res.data };
    }
    throw new Error(res.data?.message || "Bilalsadasub data dispatch failed");
  }

  if (provider === "VTPASS") {
    const serviceMap = {
      MTN: "mtn-data",
      AIRTEL: "airtel-data",
      GLO: "glo-data",
      "9MOBILE": "etisalat-data",
    };
    const res = await axios.post(
      "https://api-service.vtpass.com/api/pay",
      {
        request_id: reference,
        serviceID: serviceMap[normNet] || "glo-data",
        billersCode: phone,
        variation_code: String(planCode || numericMB),
        phone,
      },
      {
        headers: {
          "api-key": process.env.VTPASS_API_KEY,
          "secret-key": process.env.VTPASS_SECRET_KEY,
        },
        timeout: 35000,
      }
    );
    if (res.data?.code === "000") {
      return { success: true, provider: "VTPASS", raw: res.data };
    }
    throw new Error(res.data?.response_description || "VTpass data dispatch failed");
  }

  if (provider === "SMARTSMS") {
    const netMap = { MTN: "1", AIRTEL: "2", GLO: "3", "9MOBILE": "4" };
    const res = await axios.post(
      "https://smartsmssolutions.com/api/json.php",
      {
        token: process.env.SMARTSMS_API_TOKEN,
        type: "internet_data",
        network: netMap[normNet] || "3",
        phone,
        product_code: String(planCode || numericMB),
        ref: reference,
      },
      { timeout: 35000 }
    );
    if (res.data?.code === "1000" || res.data?.status === "success") {
      return { success: true, provider: "SMARTSMS", raw: res.data };
    }
    throw new Error(res.data?.message || "SmartSMS data dispatch failed");
  }

  throw new Error(`Unsupported API data provider: ${provider}`);
};

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
   2. UNIVERSAL DATA PURCHASE (HYBRID ROUTING)
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

    const targetPhone = cleanLocalPhone(phoneNumber || phone || "");
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

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    // 2. Nemo Tsarin Plan daga ServicePricing
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

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + validityDays);

    // 3. Tabbatar da Kudin Wallet
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

    const txReference = reference || `AYAX_DATA_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // 4. Cire Kudin Wallet da Bude Transaction
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

    // 5. Gano lambobin bundle (numericMB, mtnSmeCode, airtelText)
    const raw = String(pricingPlan.dataSize || targetCode).toUpperCase().trim();
    let numericMB = "1000";
    let mtnSmeCode = "SMEB";
    let airtelPlanText = "1GB";

    if (raw.includes("500")) {
      numericMB = "500";
      mtnSmeCode = "SMEA";
      airtelPlanText = "500MB";
    } else if (raw.includes("2GB") || raw.includes("2000")) {
      numericMB = "2000";
      mtnSmeCode = "SMEC";
      airtelPlanText = "2GB";
    } else if (raw.includes("3GB") || raw.includes("3000")) {
      numericMB = "3000";
      mtnSmeCode = "SMED";
      airtelPlanText = "3GB";
    } else if (raw.includes("5GB") || raw.includes("5000")) {
      numericMB = "5000";
      mtnSmeCode = "SMEE";
      airtelPlanText = "5GB";
    } else if (raw.includes("10GB") || raw.includes("10000")) {
      numericMB = "10000";
      mtnSmeCode = "SMEF";
      airtelPlanText = "10GB";
    }

    // 6. ROUTE 1: GSM GATEWAY (MTN DA AIRTEL KADAI TA HANYAR SMS)
    const isGsmEligible = resolvedNetwork === "MTN" || resolvedNetwork === "AIRTEL";
    let activeDevice = null;
    let targetSim = null;

    if (isGsmEligible) {
      activeDevice = await prisma.gsmDevice.findFirst({
        where: {
          status: "ONLINE",
          lastSeen: { gte: new Date(Date.now() - 2 * 60 * 1000) },
        },
        include: { sims: true },
        orderBy: { lastSeen: "desc" },
      });

      targetSim = activeDevice?.sims?.find(
        (s) =>
          s.status === "ACTIVE" &&
          (s.carrierName?.toUpperCase().includes(resolvedNetwork) ||
           s.displayName?.toUpperCase().includes(resolvedNetwork))
      );
    }

    if (isGsmEligible && activeDevice && targetSim) {
      const slotIndex = Number(targetSim.slotIndex ?? 0);
      const pin = process.env.GSM_DATA_PIN || "1997";

      let smsRecipient = "312";
      let smsMessage = "";

      if (resolvedNetwork === "MTN") {
        smsRecipient = "312";
        smsMessage = `${mtnSmeCode} ${targetPhone} ${pin}`;
      } else if (resolvedNetwork === "AIRTEL") {
        smsRecipient = "141";
        smsMessage = `SHARE ${targetPhone} ${airtelPlanText} ${pin}`;
      }

      const commandPayload = {
        reference: txReference,
        commandId: txReference,
        id: txReference,
        deviceId: activeDevice.id,
        type: "SEND_SMS",
        action: "SEND_SMS",
        service: "DATA",
        recipient: smsRecipient,
        sendTo: smsRecipient,
        destination: smsRecipient,
        phone: smsRecipient,
        phoneNumber: smsRecipient,
        message: smsMessage,
        smsBody: smsMessage,
        smsText: smsMessage,
        targetPhone,
        slotIndex,
        simSlot: slotIndex,
        amount: cost,
        network: resolvedNetwork,
      };

      await prisma.gsmCommand.create({
        data: {
          reference: txReference,
          deviceId: activeDevice.id,
          type: "SEND_SMS",
          status: "PENDING",
          payload: commandPayload,
        },
      }).catch(() => null);

      try {
        emitEvent("gateway-command", commandPayload, activeDevice.id);
        emitEvent("command", commandPayload, activeDevice.id);
        if (typeof emitGatewayCommand === "function") {
          emitGatewayCommand(activeDevice.id, commandPayload);
        }
        console.log(`📱 [DATA SMS DISPATCH] Ref: ${txReference} -> SIM Slot ${slotIndex} (${smsRecipient}: ${smsMessage})`);
      } catch (socketErr) {
        console.warn("Socket emission error:", socketErr.message);
      }

      return res.status(200).json({
        status: "success",
        code: "TRANSACTION_QUEUED",
        route: "GSM_GATEWAY",
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
    }

    // 7. ROUTE 2: SMART CASCADING API (GLO, 9MOBILE, KO IDAN SIM DIN MTN/AIRTEL NA OFFLINE)
    const balances = await getProviderBalances();
    const providerErrors = [];

    const candidates = [
      { name: "BILALSADA", balance: balances.BILALSADA },
      { name: "VTPASS", balance: balances.VTPASS },
      { name: "SMARTSMS", balance: balances.SMARTSMS },
    ]
      .filter((p) => p.balance >= cost)
      .map((p) => p.name);

    if (candidates.length === 0) {
      if (process.env.BILALSADA_API_TOKEN) candidates.push("BILALSADA");
      if (process.env.VTPASS_API_KEY) candidates.push("VTPASS");
      if (process.env.SMARTSMS_API_TOKEN) candidates.push("SMARTSMS");
    }

    for (const provider of candidates) {
      try {
        console.log(`🌐 [DATA ROUTING]: Trying ${provider} for ${resolvedNetwork} Data to ${targetPhone}...`);
        const resData = await dispatchDataAPI({
          provider,
          network: resolvedNetwork,
          phone: targetPhone,
          planCode: targetCode,
          numericMB,
          reference: txReference,
        });

        if (resData.success) {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "SUCCESSFUL",
              description: `${planName} to ${targetPhone} via ${provider}`,
            },
          });

          return res.status(200).json({
            status: "success",
            code: "PURCHASE_SUCCESSFUL",
            route: provider,
            message: `Data successfully credited to ${targetPhone} via ${provider}.`,
            data: {
              reference: txReference,
              network: resolvedNetwork,
              phone: targetPhone,
              plan: planName,
              validity: `${validityDays} Days`,
              expiryDate: expiryDate.toISOString(),
              amountCharged: cost,
              walletBalance: updatedWallet.balance,
              providerResult: resData.raw,
            },
          });
        }
      } catch (err) {
        console.warn(`⚠️ [DATA API FAIL]: ${provider} - ${err.message}. Cascading to next...`);
        providerErrors.push(`${provider}: ${err.message}`);
      }
    }

    // 8. AUTO-REFUND NAN TAKE IDAN DUKKAN HANYOYI SUN FAƊI
    console.error("Data purchase failed across all routes, refunding user...");

    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { increment: cost } },
      }),
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          description: `FAILED: ${planName} to ${targetPhone} (Refunded ₦${cost})`,
        },
      }),
    ]);

    return res.status(502).json({
      status: "error",
      code: "VENDOR_ERROR",
      message: `Data delivery failed across all available gateways. Wallet refunded. Errors: ${providerErrors.join(" | ")}`,
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