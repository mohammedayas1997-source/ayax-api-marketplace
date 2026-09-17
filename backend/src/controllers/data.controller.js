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

// Helper: Nemo Al-Ihsan Token daga duk sunayen da zai iya zama a Render
const getAlihsanToken = () => {
  return (
    process.env.ALIHSAN_AUTH_TOKEN ||
    process.env.ALIHSAN_TOKEN ||
    process.env.ALIHSAN_API_KEY ||
    process.env.VTU_API_KEY ||
    process.env.DATA_API_KEY ||
    "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x"
  );
};

// Helper: Tabbatar da tsarin Authorization Token na Al-Ihsan (Token xxxxxxxxx)
const formatAlihsanAuth = (rawToken) => {
  if (!rawToken) return "";
  const token = String(rawToken).trim();
  return token.startsWith("Token ") ? token : `Token ${token}`;
};

// Helper: Karanta lissafin kudi ko da a string ne ko da comma
const parseBalanceValue = (val) => {
  if (val === undefined || val === null) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Helper: Duba balance na Providers a lokacin da bukata ta taso
const getProviderBalances = async () => {
  const balances = {
    ALIHSAN: 0,
    SMARTSMS: 0,
    CLUBCONNECT: 0,
    BILALSADA: 0,
    GLOBECONNECT: 0,
    AJAH: 0,
    VTPASS: 0,
  };

  // 1. Al-Ihsan Datasub (Gyaran Endpoint da Token Format)
  const rawAlihsanToken = getAlihsanToken();

  if (rawAlihsanToken) {
    try {
      const authHeader = formatAlihsanAuth(rawAlihsanToken);
      const baseUrl = process.env.ALIHSAN_BASE_URL || "https://alihsandatasub.com.ng/api";
      
      const res = await axios.get(`${baseUrl}/user/`, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 7000,
      });

      const rawBal =
        res.data?.user?.wallet_balance ??
        res.data?.user?.balance ??
        res.data?.wallet_balance ??
        res.data?.balance ??
        res.data?.data?.wallet_balance ??
        res.data?.data?.balance ??
        0;

      balances.ALIHSAN = parseBalanceValue(rawBal);
    } catch (_) {
      try {
        const resOld = await axios.get("https://alihsandatasub.com.ng/api/v1/user.php", {
          headers: { Authorization: formatAlihsanAuth(rawAlihsanToken) },
          timeout: 5000,
        });
        const oldBal =
          resOld.data?.user?.wallet_balance ??
          resOld.data?.wallet_balance ??
          resOld.data?.balance ??
          0;
        balances.ALIHSAN = parseBalanceValue(oldBal);
      } catch (errFallback) {
        // Idan kiran balance ya gaza, a sa masa 999999 don kar a hana shi gwada tura odar
        balances.ALIHSAN = 999999;
      }
    }
  }

  // 2. SmartSMS
  if (process.env.SMARTSMS_API_TOKEN) {
    try {
      const res = await axios.get(
        `https://smartsmssolutions.com/api/json.php?token=${process.env.SMARTSMS_API_TOKEN}&type=balance`,
        { timeout: 4000 }
      );
      balances.SMARTSMS = parseBalanceValue(res.data?.balance);
    } catch (_) {
      balances.SMARTSMS = 0;
    }
  }

  // 3. ClubConnect
  if (process.env.CLUBCONNECT_USER_ID && process.env.CLUBCONNECT_API_KEY) {
    try {
      const res = await axios.get(
        `https://www.clubconnect.com.ng/api/walletbalance?UserID=${process.env.CLUBCONNECT_USER_ID}&APIKey=${process.env.CLUBCONNECT_API_KEY}`,
        { timeout: 4000 }
      );
      balances.CLUBCONNECT = parseBalanceValue(res.data?.balance || res.data?.WalletBalance);
    } catch (_) {
      balances.CLUBCONNECT = 0;
    }
  }

  // 4. BilalSada
  if (process.env.BILALSADA_API_TOKEN) {
    try {
      const res = await axios.get("https://bilalsadasub.com/api/user", {
        headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
        timeout: 4000,
      });
      balances.BILALSADA = parseBalanceValue(res.data?.user?.wallet_balance || res.data?.wallet);
    } catch (_) {
      balances.BILALSADA = 0;
    }
  }

  // 5. GlobeConnect
  if (process.env.GLOBECONNECT_API_KEY) {
    try {
      const res = await axios.get("https://api.globeconnect.ng/api/user/balance", {
        headers: { Authorization: `Bearer ${process.env.GLOBECONNECT_API_KEY}` },
        timeout: 4000,
      });
      balances.GLOBECONNECT = parseBalanceValue(res.data?.balance || res.data?.data?.balance);
    } catch (_) {
      balances.GLOBECONNECT = 0;
    }
  }

  // 6. Ajah
  if (process.env.AJAH_API_KEY) {
    try {
      const res = await axios.get("https://ajah.com.ng/api/user", {
        headers: { Authorization: `Token ${process.env.AJAH_API_KEY}` },
        timeout: 4000,
      });
      balances.AJAH = parseBalanceValue(res.data?.user?.wallet_balance || res.data?.balance);
    } catch (_) {
      balances.AJAH = 0;
    }
  }

  // 7. VTpass
  if (process.env.VTPASS_API_KEY && process.env.VTPASS_SECRET_KEY) {
    try {
      const res = await axios.get("https://api-service.vtpass.com/api/balance", {
        headers: {
          "api-key": process.env.VTPASS_API_KEY,
          "secret-key": process.env.VTPASS_SECRET_KEY,
        },
        timeout: 4000,
      });
      balances.VTPASS = parseBalanceValue(res.data?.contents?.balance);
    } catch (_) {
      balances.VTPASS = 0;
    }
  }

  return balances;
};

// Helper: Tura Data ta hanyar API da aka zaba
const dispatchDataAPI = async ({ provider, network, phone, planCode, numericMB, reference }) => {
  const normNet = network.toUpperCase();

  // 1. AL-IHSAN DATASUB
  if (provider === "ALIHSAN") {
    const netMap = { MTN: 1, GLO: 2, "9MOBILE": 3, AIRTEL: 4 };
    const rawAlihsanToken = getAlihsanToken();
    const authHeader = formatAlihsanAuth(rawAlihsanToken);
    const baseUrl = process.env.ALIHSAN_BASE_URL || "https://alihsandatasub.com.ng/api";

    const res = await axios.post(
      `${baseUrl}/data/`,
      {
        network: netMap[normNet] || 1,
        plan: Number(planCode || numericMB),
        mobile_number: cleanLocalPhone(phone),
        Ported_number: true,
        reference: reference,
      },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 35000,
      }
    );

    const statusText = String(res.data?.status || res.data?.Status || "").toLowerCase();
    if (statusText === "success" || statusText === "successful" || statusText === "true") {
      return { success: true, provider: "ALIHSAN", raw: res.data };
    }
    throw new Error(res.data?.message || res.data?.error || res.data?.msg || "Al-Ihsan data dispatch failed");
  }

  // 2. SMARTSMS
  if (provider === "SMARTSMS") {
    const netMap = { MTN: "1", AIRTEL: "2", GLO: "3", "9MOBILE": "4" };
    const res = await axios.post(
      "https://smartsmssolutions.com/api/json.php",
      {
        token: process.env.SMARTSMS_API_TOKEN,
        type: "internet_data",
        network: netMap[normNet] || "1",
        phone: cleanLocalPhone(phone),
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

  // 3. CLUBCONNECT
  if (provider === "CLUBCONNECT") {
    const clubNetMap = {
      MTN: "01",
      GLO: "02",
      "9MOBILE": "03",
      AIRTEL: "04",
    };
    const userId = process.env.CLUBCONNECT_USER_ID;
    const apiKey = process.env.CLUBCONNECT_API_KEY;

    const url = `https://www.clubconnect.com.ng/api/data?UserID=${userId}&APIKey=${apiKey}&MobileNetwork=${clubNetMap[normNet] || "01"}&DataPlan=${planCode || numericMB}&MobileNumber=${cleanLocalPhone(phone)}&RequestID=${reference}`;

    const res = await axios.get(url, { timeout: 35000 });
    const statusText = String(res.data?.status || res.data?.statuscode || "").toLowerCase();

    if (statusText.includes("success") || statusText === "100" || statusText === "200") {
      return { success: true, provider: "CLUBCONNECT", raw: res.data };
    }
    throw new Error(res.data?.msg || res.data?.status || "ClubConnect data dispatch failed");
  }

  // 4. BILALSADA
  if (provider === "BILALSADA") {
    const netMap = { MTN: 1, GLO: 2, "9MOBILE": 3, AIRTEL: 4 };
    const res = await axios.post(
      "https://bilalsadasub.com/api/data",
      {
        network: netMap[normNet] || 1,
        phone: cleanLocalPhone(phone),
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

  // 5. GLOBECONNECT
  if (provider === "GLOBECONNECT") {
    const res = await axios.post(
      "https://api.globeconnect.ng/api/data",
      {
        network: normNet,
        plan_id: planCode || numericMB,
        phone: cleanLocalPhone(phone),
        reference,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GLOBECONNECT_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 35000,
      }
    );
    if (res.data?.status === "success" || res.data?.status === true) {
      return { success: true, provider: "GLOBECONNECT", raw: res.data };
    }
    throw new Error(res.data?.message || "GlobeConnect data dispatch failed");
  }

  // 6. AJAH API
  if (provider === "AJAH") {
    const res = await axios.post(
      "https://ajah.com.ng/api/data",
      {
        network_id: normNet.toLowerCase(),
        plan_id: planCode || numericMB,
        phone_number: cleanLocalPhone(phone),
        ident: reference,
      },
      {
        headers: {
          Authorization: `Token ${process.env.AJAH_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 35000,
      }
    );
    if (res.data?.status === "success" || res.data?.status === "successful") {
      return { success: true, provider: "AJAH", raw: res.data };
    }
    throw new Error(res.data?.message || "Ajah data dispatch failed");
  }

  // 7. VTPASS
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
        billersCode: cleanLocalPhone(phone),
        variation_code: String(planCode || numericMB),
        phone: cleanLocalPhone(phone),
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

  throw new Error(`Unsupported API data provider: ${provider}`);
};

// Helper: Tura Airtime ta hanyar API da aka zaba
const dispatchAirtimeAPI = async ({ provider, network, phone, amount, reference }) => {
  const normNet = network.toUpperCase();

  // 1. AL-IHSAN AIRTIME
  if (provider === "ALIHSAN") {
    const netMap = { MTN: 1, GLO: 2, "9MOBILE": 3, AIRTEL: 4 };
    const rawAlihsanToken = getAlihsanToken();
    const authHeader = formatAlihsanAuth(rawAlihsanToken);
    const baseUrl = process.env.ALIHSAN_BASE_URL || "https://alihsandatasub.com.ng/api";

    const res = await axios.post(
      `${baseUrl}/topup/`,
      {
        network: netMap[normNet] || 1,
        amount: Number(amount),
        mobile_number: cleanLocalPhone(phone),
        Ported_number: true,
        airtime_type: "VTU",
      },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 35000,
      }
    );

    const statusText = String(res.data?.status || res.data?.Status || "").toLowerCase();
    if (statusText === "success" || statusText === "successful" || statusText === "true") {
      return { success: true, provider: "ALIHSAN", raw: res.data };
    }
    throw new Error(res.data?.message || res.data?.error || "Al-Ihsan airtime failed");
  }

  // 2. SMARTSMS AIRTIME
  if (provider === "SMARTSMS") {
    const netMap = { MTN: "1", AIRTEL: "2", GLO: "3", "9MOBILE": "4" };
    const res = await axios.post(
      "https://smartsmssolutions.com/api/json.php",
      {
        token: process.env.SMARTSMS_API_TOKEN,
        type: "airtime",
        network: netMap[normNet] || "1",
        phone: cleanLocalPhone(phone),
        amount: Number(amount),
        ref: reference,
      },
      { timeout: 35000 }
    );
    if (res.data?.code === "1000" || res.data?.status === "success") {
      return { success: true, provider: "SMARTSMS", raw: res.data };
    }
    throw new Error(res.data?.message || "SmartSMS airtime failed");
  }

  throw new Error(`Unsupported Airtime provider: ${provider}`);
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

    // 6. ROUTE 1: GSM GATEWAY (PRIORITY 1 GA MTN DA AIRTEL)
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
        message: `Data purchase queued on local modem for ${planName} to ${targetPhone}.`,
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

    // 7. ROUTE 2: SMART CASCADING API
    const balances = await getProviderBalances();
    const providerErrors = [];

    const allProviders = [
      { name: "ALIHSAN", balance: balances.ALIHSAN, hasEnv: Boolean(getAlihsanToken()) },
      { name: "SMARTSMS", balance: balances.SMARTSMS, hasEnv: Boolean(process.env.SMARTSMS_API_TOKEN) },
      { name: "CLUBCONNECT", balance: balances.CLUBCONNECT, hasEnv: Boolean(process.env.CLUBCONNECT_API_KEY) },
      { name: "BILALSADA", balance: balances.BILALSADA, hasEnv: Boolean(process.env.BILALSADA_API_TOKEN) },
      { name: "GLOBECONNECT", balance: balances.GLOBECONNECT, hasEnv: Boolean(process.env.GLOBECONNECT_API_KEY) },
      { name: "AJAH", balance: balances.AJAH, hasEnv: Boolean(process.env.AJAH_API_KEY) },
      { name: "VTPASS", balance: balances.VTPASS, hasEnv: Boolean(process.env.VTPASS_API_KEY) },
    ];

    // Zabi providers da suke da kudi ko kuma wadanda ba su da 0
    let candidates = allProviders
      .filter((p) => p.hasEnv && p.balance >= cost)
      .map((p) => p.name);

    if (candidates.length === 0) {
      candidates = allProviders.filter((p) => p.hasEnv).map((p) => p.name);
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
        console.warn(`⚠️ [DATA API FAIL]: ${provider} - ${err.message}. Cascading to next provider...`);
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
   3. UNIVERSAL AIRTIME PURCHASE
====================================================== */
exports.purchaseAirtime = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const { network, phone, phoneNumber, amount, reference } = req.body;

    const targetPhone = cleanLocalPhone(phoneNumber || phone || "");
    const resolvedNetwork = String(network || "MTN").toUpperCase().trim();
    const airtimeAmount = Number(amount || 0);

    if (!targetPhone || targetPhone.length < 10) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "A valid recipient phone number is required.",
      });
    }

    if (airtimeAmount < 50) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Minimum airtime purchase is ₦50.",
      });
    }

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < airtimeAmount) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient wallet balance for this airtime purchase.",
      });
    }

    const txReference = reference || `AYAX_AIRTIME_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: airtimeAmount } },
      });

      const newTx = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEBIT",
          service: `${resolvedNetwork} AIRTIME`,
          amount: airtimeAmount,
          status: "PENDING",
          reference: txReference,
          description: `₦${airtimeAmount} Airtime to ${targetPhone}`,
        },
      });

      return { updatedWallet: newWallet, transaction: newTx };
    });

    const airtimeProviders = ["ALIHSAN", "SMARTSMS"];
    const airtimeErrors = [];

    for (const provider of airtimeProviders) {
      try {
        const resData = await dispatchAirtimeAPI({
          provider,
          network: resolvedNetwork,
          phone: targetPhone,
          amount: airtimeAmount,
          reference: txReference,
        });

        if (resData.success) {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "SUCCESSFUL",
              description: `₦${airtimeAmount} Airtime to ${targetPhone} via ${provider}`,
            },
          });

          return res.status(200).json({
            status: "success",
            code: "AIRTIME_SUCCESSFUL",
            message: `₦${airtimeAmount} Airtime sent to ${targetPhone} successfully!`,
            walletBalance: updatedWallet.balance,
          });
        }
      } catch (err) {
        airtimeErrors.push(`${provider}: ${err.message}`);
      }
    }

    // Refund wallet
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { increment: airtimeAmount } },
      }),
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          description: `FAILED: ₦${airtimeAmount} Airtime to ${targetPhone} (Refunded)`,
        },
      }),
    ]);

    return res.status(502).json({
      status: "error",
      code: "VENDOR_ERROR",
      message: `Airtime delivery failed across gateways. Wallet refunded. Errors: ${airtimeErrors.join(" | ")}`,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: "SERVER_ERROR",
      message: error.message,
    });
  }
};

/* ======================================================
   4. QUERY TRANSACTION STATUS
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