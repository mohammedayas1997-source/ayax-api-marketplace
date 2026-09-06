const prisma = require("../config/prisma");
const transactionService = require("./transaction.service");
const walletService = require("./wallet.service");
const apiUsageService = require("./apiUsage.service");
const calculateProfit = require("../helpers/calculateProfit");
const { emitEvent } = require("../config/socket");
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

// Helper: Duba balance na kowane Provider don Data
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
const dispatchDataAPI = async ({ provider, network, phone, planId, numericMB, reference }) => {
  const normNet = network.toUpperCase();

  if (provider === "BILALSADA") {
    const netMap = { MTN: 1, GLO: 2, "9MOBILE": 3, AIRTEL: 4 };
    const res = await axios.post(
      "https://bilalsadasub.com/api/data",
      {
        network: netMap[normNet] || 1,
        phone,
        plan: Number(planId || numericMB),
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
        variation_code: String(planId || numericMB),
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
        product_code: String(planId || numericMB),
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
   1. PURCHASE DATA BUNDLE
====================================================== */
exports.purchaseData = async ({
  user,
  apiKey,
  network,
  planCode,
  phone,
  phoneNumber,
  amount,
  reference,
}) => {
  const targetPhone = cleanLocalPhone(phone || phoneNumber || "");
  const resolvedNetwork = String(network || "MTN").toUpperCase().trim();
  const userTier = String(user?.tier || "REGULAR").toUpperCase();

  // 1. NEMI FARASHI
  const [pricingPlan, servicePlan] = await Promise.all([
    prisma.servicePricing?.findFirst({
      where: {
        category: "DATA",
        enabled: true,
        tier: userTier,
        OR: [
          { serviceCode: String(planCode).trim() },
          { serviceCode: { contains: String(planCode).trim() } },
        ],
      },
    }).catch(() => null),
    prisma.servicePlan?.findFirst({
      where: {
        planCode: String(planCode).trim(),
        network: resolvedNetwork,
        isActive: true,
      },
    }).catch(() => null),
  ]);

  const finalAmount = Number(
    amount ||
    pricingPlan?.sellingPrice ||
    servicePlan?.apiPrice ||
    servicePlan?.userPrice ||
    servicePlan?.basePrice ||
    0
  );

  if (!finalAmount || finalAmount <= 0) {
    const err = new Error("Invalid plan amount or plan code not found.");
    err.statusCode = 400;
    err.code = "INVALID_PLAN_AMOUNT";
    throw err;
  }

  // 2. TABBATAR DA WALLET BALANCE
  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < finalAmount) {
    const err = new Error(`Insufficient wallet balance. Required: ₦${finalAmount}`);
    err.statusCode = 402;
    err.code = "INSUFFICIENT_WALLET_BALANCE";
    throw err;
  }

  // 3. PRE-FLIGHT CHECK: GSM MODEM (MTN DA AIRTEL KADAI)
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

  const isGatewayReady = Boolean(isGsmEligible && activeDevice && targetSim);
  const txReference = reference || `AYAX_DATA_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  // 4. CREATE TRANSACTION RECORD & DEBIT WALLET
  const transaction = await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "DATA",
    amount: finalAmount,
    reference: txReference,
    status: "PROCESSING",
    description: `${resolvedNetwork} Data Purchase (${planCode}) to ${targetPhone}`,
    metadata: {
      network: resolvedNetwork,
      phone: targetPhone,
      planCode,
      apiKeyId: apiKey?.id,
    },
  });

  await walletService.debitWallet({
    userId: user.id,
    amount: finalAmount,
    reference: transaction.reference,
    description: `${resolvedNetwork} Data Purchase`,
    module: "DATA",
  });

  // Tace girman bundle
  let raw = String(planCode || "").toUpperCase().trim();
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

  try {
    // 5. ROUTE 1: GSM GATEWAY (MTN DA AIRTEL KADAI)
    if (isGatewayReady) {
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
        reference: transaction.reference,
        commandId: transaction.reference,
        id: transaction.reference,
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
        amount: finalAmount,
        network: resolvedNetwork,
      };

      await prisma.gsmCommand.create({
        data: {
          reference: transaction.reference,
          deviceId: activeDevice.id,
          type: "SEND_SMS",
          status: "PENDING",
          payload: commandPayload,
        },
      }).catch(() => null);

      try {
        emitEvent("gateway-command", commandPayload, activeDevice.id);
        emitEvent("command", commandPayload, activeDevice.id);
        console.log(`📱 [DATA SMS DISPATCH] Ref: ${transaction.reference} -> SIM Slot ${slotIndex} (${smsRecipient}: ${smsMessage})`);
      } catch (socketErr) {
        console.warn("Gateway socket warning:", socketErr.message);
      }

      await apiUsageService.createUsageLog({
        userId: user.id,
        endpoint: "/api/v1/data/buy",
        method: "POST",
        amount: finalAmount,
        status: "PROCESSING",
      });

      const costPrice = pricingPlan?.costPrice || servicePlan?.costPrice || finalAmount * 0.97;
      const profit = calculateProfit({ costPrice, sellingPrice: finalAmount });

      return {
        success: true,
        reference: transaction.reference,
        route: "GSM_GATEWAY",
        network: resolvedNetwork,
        phone: targetPhone,
        planCode: numericMB,
        amount: finalAmount,
        status: "PROCESSING",
        profit,
      };
    }

    // 6. ROUTE 2: SMART CASCADING API (GLO, 9MOBILE, KO IDAN SIM NA MTN/AIRTEL YA KASANCE OFFLINE)
    const balances = await getProviderBalances();
    const providerErrors = [];

    const candidates = [
      { name: "BILALSADA", balance: balances.BILALSADA },
      { name: "VTPASS", balance: balances.VTPASS },
      { name: "SMARTSMS", balance: balances.SMARTSMS },
    ]
      .filter((p) => p.balance >= finalAmount)
      .map((p) => p.name);

    if (candidates.length === 0) {
      if (process.env.BILALSADA_API_TOKEN) candidates.push("BILALSADA");
      if (process.env.VTPASS_API_KEY) candidates.push("VTPASS");
      if (process.env.SMARTSMS_API_TOKEN) candidates.push("SMARTSMS");
    }

    for (const provider of candidates) {
      try {
        console.log(`🌐 [DATA ROUTING]: Trying ${provider} for ${resolvedNetwork} Data to ${targetPhone}...`);
        const res = await dispatchDataAPI({
          provider,
          network: resolvedNetwork,
          phone: targetPhone,
          planId: servicePlan?.planCode || planCode || numericMB,
          numericMB,
          reference: transaction.reference,
        });

        if (res.success) {
          await transactionService.updateTransactionStatus({
            reference: transaction.reference,
            status: "SUCCESSFUL",
            description: `${resolvedNetwork} Data (${planCode}) to ${targetPhone} via ${provider}`,
          });

          await apiUsageService.createUsageLog({
            userId: user.id,
            endpoint: "/api/v1/data/buy",
            method: "POST",
            amount: finalAmount,
            status: "SUCCESSFUL",
          });

          const costPrice = pricingPlan?.costPrice || servicePlan?.costPrice || finalAmount * 0.97;
          const profit = calculateProfit({ costPrice, sellingPrice: finalAmount });

          return {
            success: true,
            reference: transaction.reference,
            route: provider,
            network: resolvedNetwork,
            phone: targetPhone,
            planCode: numericMB,
            amount: finalAmount,
            status: "SUCCESSFUL",
            profit,
            providerResult: res.raw,
          };
        }
      } catch (err) {
        console.warn(`⚠️ [DATA API FAIL]: ${provider} - ${err.message}. Cascading to next...`);
        providerErrors.push(`${provider}: ${err.message}`);
      }
    }

    throw new Error(`Data delivery failed across all APIs: ${providerErrors.join(" | ")}`);
  } catch (err) {
    console.error("Data purchase error, executing refund:", err.message);

    await walletService.creditWallet({
      userId: user.id,
      amount: finalAmount,
      reference: `REFUND_${transaction.reference}`,
      description: `Refund for failed data purchase: ${transaction.reference}`,
      module: "REFUND",
    }).catch((e) => console.error("Refund failed:", e));

    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "FAILED",
      description: err.message || "Provider delivery error",
    });

    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/v1/data/buy",
      method: "POST",
      amount: finalAmount,
      status: "FAILED",
    });

    const error = new Error(err.message || "Data provider delivery failed.");
    error.statusCode = err.statusCode || 502;
    error.code = err.code || "PROVIDER_DELIVERY_FAILED";
    throw error;
  }
};

/* ======================================================
   2. GET DATA TRANSACTIONS
====================================================== */
exports.getDataTransactions = async (userId) => {
  return prisma.transaction.findMany({
    where: {
      userId,
      service: "DATA",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
};

/* ======================================================
   3. GET AVAILABLE PLANS
====================================================== */
exports.getDataPlans = async (network) => {
  const whereClause = {
    type: "DATA",
    isActive: true,
  };

  if (network) {
    whereClause.network = String(network).toUpperCase();
  }

  if (prisma.servicePlan) {
    return prisma.servicePlan.findMany({
      where: whereClause,
      select: {
        id: true,
        planCode: true,
        name: true,
        network: true,
        volume: true,
        validity: true,
        apiPrice: true,
        basePrice: true,
      },
      orderBy: {
        apiPrice: "asc",
      },
    });
  }

  return [];
};