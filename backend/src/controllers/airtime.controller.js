const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");
const axios = require("axios");

// Tsoffin discounts a matsayin madogara (Fallback) idan ba a saita a Database ba
const DEFAULT_DISCOUNTS = {
  MTN: 0.02,     // 2% discount
  AIRTEL: 0.02,  // 2% discount
  GLO: 0.03,     // 3% discount
  "9MOBILE": 0.03 // 3% discount
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

// Helper: Duba balance na kowane provider don Airtime
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

  // 1. Al-Ihsan Datasub Balance
  const alihsanToken =
    process.env.ALIHSAN_AUTH_TOKEN ||
    process.env.ALIHSAN_API_KEY ||
    "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x";

  if (alihsanToken) {
    try {
      const baseUrl = process.env.ALIHSAN_BASE_URL || "https://alihsandatasub.com.ng/api/v1";
      const res = await axios.get(`${baseUrl}/user.php`, {
        headers: { Authorization: alihsanToken },
        timeout: 4000,
      });
      balances.ALIHSAN = Number(
        res.data?.user?.wallet_balance ||
        res.data?.wallet_balance ||
        res.data?.balance ||
        0
      );
    } catch (_) {
      balances.ALIHSAN = 0;
    }
  }

  // 2. SmartSMS
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

  // 3. ClubConnect
  if (process.env.CLUBCONNECT_USER_ID && process.env.CLUBCONNECT_API_KEY) {
    try {
      const res = await axios.get(
        `https://www.clubconnect.com.ng/api/walletbalance?UserID=${process.env.CLUBCONNECT_USER_ID}&APIKey=${process.env.CLUBCONNECT_API_KEY}`,
        { timeout: 4000 }
      );
      balances.CLUBCONNECT = Number(res.data?.balance || res.data?.WalletBalance || 0);
    } catch (_) {
      balances.CLUBCONNECT = 0;
    }
  }

  // 4. Bilalsadasub
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

  // 5. GlobeConnect
  if (process.env.GLOBECONNECT_API_KEY) {
    try {
      const res = await axios.get("https://api.globeconnect.ng/api/user/balance", {
        headers: { Authorization: `Bearer ${process.env.GLOBECONNECT_API_KEY}` },
        timeout: 4000,
      });
      balances.GLOBECONNECT = Number(res.data?.balance || res.data?.data?.balance || 0);
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
      balances.AJAH = Number(res.data?.user?.wallet_balance || res.data?.balance || 0);
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
      balances.VTPASS = Number(res.data?.contents?.balance || 0);
    } catch (_) {
      balances.VTPASS = 0;
    }
  }

  return balances;
};

// Helper: Tura Airtime ta hanyar API da aka zaba
const dispatchAirtimeAPI = async ({ provider, network, phone, amount, reference }) => {
  const normNet = network.toUpperCase();

  // 1. AL-IHSAN DATASUB
  if (provider === "ALIHSAN") {
    const netMap = { MTN: 1, GLO: 2, "9MOBILE": 3, AIRTEL: 4 };
    const alihsanToken =
      process.env.ALIHSAN_AUTH_TOKEN ||
      process.env.ALIHSAN_API_KEY ||
      "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x";

    const baseUrl = process.env.ALIHSAN_BASE_URL || "https://alihsandatasub.com.ng/api/v1";

    const res = await axios.post(
      `${baseUrl}/airtime.php`,
      {
        network: netMap[normNet] || 1,
        amount: Number(amount),
        mobile_number: phone,
        airtime_type: "VTU",
        Ported_number: true,
      },
      {
        headers: {
          Authorization: alihsanToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      }
    );

    const statusText = String(res.data?.status || "").toLowerCase();
    if (statusText === "success" || statusText === "successful" || statusText === "true") {
      return { success: true, provider: "ALIHSAN", raw: res.data };
    }
    throw new Error(res.data?.message || res.data?.error || "Al-Ihsan airtime failed");
  }

  // 2. SMARTSMS
  if (provider === "SMARTSMS") {
    const netMap = { MTN: "1", AIRTEL: "2", GLO: "3", "9MOBILE": "4" };
    const res = await axios.post(
      "https://smartsmssolutions.com/api/json.php",
      {
        token: process.env.SMARTSMS_API_TOKEN,
        type: "airtime",
        network: netMap[normNet] || "1",
        phone,
        amount: Number(amount),
        ref: reference,
      },
      { timeout: 30000 }
    );
    if (res.data?.code === "1000" || res.data?.status === "success" || res.data?.status === "successful") {
      return { success: true, provider: "SMARTSMS", raw: res.data };
    }
    throw new Error(res.data?.message || res.data?.error || "SmartSMS airtime failed");
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

    const url = `https://www.clubconnect.com.ng/api/airtime?UserID=${userId}&APIKey=${apiKey}&MobileNetwork=${clubNetMap[normNet] || "01"}&Amount=${amount}&MobileNumber=${phone}&RequestID=${reference}`;

    const res = await axios.get(url, { timeout: 30000 });
    const statusText = String(res.data?.status || res.data?.statuscode || "").toLowerCase();

    if (statusText.includes("success") || statusText === "100" || statusText === "200") {
      return { success: true, provider: "CLUBCONNECT", raw: res.data };
    }
    throw new Error(res.data?.msg || res.data?.status || "ClubConnect airtime failed");
  }

  // 4. BILALSADA
  if (provider === "BILALSADA") {
    const netMap = { MTN: 1, GLO: 2, "9MOBILE": 3, AIRTEL: 4 };
    const res = await axios.post(
      "https://bilalsadasub.com/api/topup",
      {
        network: netMap[normNet] || 1,
        phone,
        amount: Number(amount),
        plan_type: "VTU",
        "request-id": reference,
      },
      {
        headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
        timeout: 30000,
      }
    );
    if (res.data?.status === "success" || res.data?.status === "process") {
      return { success: true, provider: "BILALSADA", raw: res.data };
    }
    throw new Error(res.data?.message || "Bilalsadasub airtime failed");
  }

  // 5. GLOBECONNECT
  if (provider === "GLOBECONNECT") {
    const res = await axios.post(
      "https://api.globeconnect.ng/api/airtime",
      {
        network: normNet,
        amount: Number(amount),
        phone,
        reference,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GLOBECONNECT_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
    if (res.data?.status === "success" || res.data?.status === true) {
      return { success: true, provider: "GLOBECONNECT", raw: res.data };
    }
    throw new Error(res.data?.message || "GlobeConnect airtime failed");
  }

  // 6. AJAH API
  if (provider === "AJAH") {
    const res = await axios.post(
      "https://ajah.com.ng/api/topup",
      {
        network_id: normNet.toLowerCase(),
        amount: Number(amount),
        phone_number: phone,
        ident: reference,
      },
      {
        headers: {
          Authorization: `Token ${process.env.AJAH_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
    if (res.data?.status === "success" || res.data?.status === "successful") {
      return { success: true, provider: "AJAH", raw: res.data };
    }
    throw new Error(res.data?.message || "Ajah airtime failed");
  }

  // 7. VTPASS
  if (provider === "VTPASS") {
    const serviceMap = {
      MTN: "mtn",
      AIRTEL: "airtel",
      GLO: "glo",
      "9MOBILE": "etisalat",
    };
    const res = await axios.post(
      "https://api-service.vtpass.com/api/pay",
      {
        request_id: reference,
        serviceID: serviceMap[normNet] || "mtn",
        amount: Number(amount),
        phone,
      },
      {
        headers: {
          "api-key": process.env.VTPASS_API_KEY,
          "secret-key": process.env.VTPASS_SECRET_KEY,
        },
        timeout: 30000,
      }
    );
    if (res.data?.code === "000") {
      return { success: true, provider: "VTPASS", raw: res.data };
    }
    throw new Error(res.data?.response_description || "VTpass airtime failed");
  }

  throw new Error(`Unsupported provider: ${provider}`);
};

/* ======================================================
   1. PURCHASE AIRTIME VIA MARKETPLACE API
====================================================== */
exports.purchaseAirtime = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const { network, phone, phoneNumber, amount, reference } = req.body;

    const targetPhone = cleanLocalPhone(phoneNumber || phone || "");
    const numericAmount = Math.round(Number(amount));
    const normalizedNetwork = String(network || "MTN").toUpperCase().trim();

    if (!normalizedNetwork || !targetPhone || !numericAmount || numericAmount < 50) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Valid network, recipient phone number, and minimum amount of NGN 50 are required.",
      });
    }

    // 1. Hana Maimaita Transaction (Idempotency Check)
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

    // 2. Gano Matsayin Developer (Tier)
    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    // 3. Nemi Ainihin Farashi daga ServicePricing a Database
    const pricingPlan = await prisma.servicePricing.findFirst({
      where: {
        category: "AIRTIME",
        enabled: true,
        tier: userTier,
        OR: [
          { serviceCode: `${normalizedNetwork}_AIRTIME` },
          { serviceCode: normalizedNetwork },
          { serviceName: { contains: normalizedNetwork, mode: "insensitive" } },
        ],
      },
    });

    let discountAmount = 0;
    let amountToCharge = numericAmount;

    if (pricingPlan && pricingPlan.sellingPrice > 0) {
      const rate = pricingPlan.sellingPrice <= 1 
        ? pricingPlan.sellingPrice 
        : (pricingPlan.sellingPrice / 100);
      
      amountToCharge = Number((numericAmount * rate).toFixed(2));
      discountAmount = Number((numericAmount - amountToCharge).toFixed(2));
    } else {
      const fallbackRate = DEFAULT_DISCOUNTS[normalizedNetwork] || 0.02;
      discountAmount = Number((numericAmount * fallbackRate).toFixed(2));
      amountToCharge = Number((numericAmount - discountAmount).toFixed(2));
    }

    // 4. Duba Kuɗin Wallet na Mai Saye
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < amountToCharge) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient wallet balance to complete this purchase.",
        currentBalance: wallet ? Number(wallet.balance) : 0,
        requiredAmount: amountToCharge,
      });
    }

    const txReference = reference || `AYAX_AIR_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // 5. Cire Kudi a Wallet da adana PENDING Transaction
    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: {
          balance: { decrement: amountToCharge },
        },
      });

      const newTx = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEBIT",
          service: `${normalizedNetwork} AIRTIME`,
          amount: amountToCharge,
          status: "PENDING",
          reference: txReference,
          description: `Airtime purchase of NGN ${numericAmount} to ${targetPhone} (Charged: NGN ${amountToCharge})`,
        },
      });

      return { updatedWallet: newWallet, transaction: newTx };
    });

    // 6. TAFARKI NA FARKO: GSM GATEWAY (PRIORITY 1)
    const activeDevice = await prisma.gsmDevice.findFirst({
      where: { 
        status: "ONLINE",
        lastSeen: { gte: new Date(Date.now() - 2 * 60 * 1000) }
      },
      include: { sims: true },
      orderBy: { lastSeen: "desc" },
    });

    const targetSim = activeDevice?.sims?.find(
      (s) =>
        s.status === "ACTIVE" &&
        (s.carrierName?.toUpperCase().includes(normalizedNetwork) ||
         s.displayName?.toUpperCase().includes(normalizedNetwork))
    ) || activeDevice?.sims?.[0];

    if (activeDevice && targetSim) {
      const slotIndex = Number(targetSim.slotIndex ?? 0);
      const pin = process.env.GSM_AIRTIME_PIN || "1997";
      const momoPin = process.env.MOMO_PIN || "8724";

      let ussdCode = "*671#";
      let steps = [];
      let pauseDialString = "";
      let directCode = "";

      if (normalizedNetwork === "MTN") {
        steps = ["2", "1", "3", targetPhone, String(numericAmount), momoPin];
        ussdCode = "*671#";
        pauseDialString = `*671#,2,1,3,${targetPhone},${numericAmount},${momoPin}#`;
        directCode = `*671*2*1*3*${targetPhone}*${numericAmount}*${momoPin}#`;
      } else if (normalizedNetwork === "AIRTEL") {
        ussdCode = `*321*${targetPhone}*${numericAmount}*${pin}#`;
        steps = [targetPhone, String(numericAmount), pin];
        pauseDialString = ussdCode;
        directCode = ussdCode;
      } else if (normalizedNetwork === "GLO") {
        ussdCode = `*131*${targetPhone}*${numericAmount}*${pin}#`;
        steps = [targetPhone, String(numericAmount), pin];
        pauseDialString = ussdCode;
        directCode = ussdCode;
      } else if (normalizedNetwork === "9MOBILE") {
        ussdCode = `*223*${pin}*${numericAmount}*${targetPhone}#`;
        steps = [pin, String(numericAmount), targetPhone];
        pauseDialString = ussdCode;
        directCode = ussdCode;
      }

      const commandPayload = {
        reference: txReference,
        commandId: txReference,
        id: txReference,
        deviceId: activeDevice.id,
        type: "USSD",
        action: "USSD",
        service: "AIRTIME",
        code: ussdCode,
        ussd: ussdCode,
        ussdCode: ussdCode,
        ussd_code: ussdCode,
        text: ussdCode,
        rootCode: ussdCode,
        dialString: pauseDialString,
        fullCode: directCode,
        steps: steps,
        sessionSteps: steps.join(","),
        stepsString: steps.join(","),
        inputSteps: steps,
        responses: steps,
        phone: targetPhone,
        targetPhone: targetPhone,
        phoneNumber: targetPhone,
        slotIndex: slotIndex,
        simSlot: slotIndex,
        amount: numericAmount,
        network: normalizedNetwork,
        routeType: normalizedNetwork === "MTN" ? "MTN_MOMO" : "DIRECT_USSD",
      };

      await prisma.gsmCommand.create({
        data: {
          reference: txReference,
          deviceId: activeDevice.id,
          type: "USSD",
          status: "PENDING",
          payload: commandPayload,
        },
      }).catch(() => null);

      try {
        emitEvent("gateway-command", commandPayload, activeDevice.id);
        emitEvent("command", commandPayload, activeDevice.id);
        console.log(`⚡ [AIRTIME GSM GATEWAY DISPATCH] Ref: ${txReference} -> Root: ${ussdCode}`);

        return res.status(200).json({
          status: "success",
          code: "TRANSACTION_QUEUED",
          route: "GSM_GATEWAY",
          message: `Airtime transfer queued on local modem for ${targetPhone}.`,
          data: {
            reference: txReference,
            network: normalizedNetwork,
            phone: targetPhone,
            faceValue: numericAmount,
            amountCharged: amountToCharge,
            discount: discountAmount,
            tier: userTier,
            walletBalance: updatedWallet.balance,
          },
        });
      } catch (socketErr) {
        console.warn("Gateway socket broadcast warning:", socketErr.message);
      }
    }

    // 7. TAFARKI NA BIYU: SMART CASCADING API
    const balances = await getProviderBalances();
    const providerErrors = [];

    const hasAlIhsan = Boolean(
      process.env.ALIHSAN_AUTH_TOKEN ||
      process.env.ALIHSAN_API_KEY ||
      "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x"
    );

    const allProviders = [
      { name: "ALIHSAN", balance: balances.ALIHSAN, hasEnv: hasAlIhsan },
      { name: "SMARTSMS", balance: balances.SMARTSMS, hasEnv: Boolean(process.env.SMARTSMS_API_TOKEN) },
      { name: "CLUBCONNECT", balance: balances.CLUBCONNECT, hasEnv: Boolean(process.env.CLUBCONNECT_API_KEY) },
      { name: "BILALSADA", balance: balances.BILALSADA, hasEnv: Boolean(process.env.BILALSADA_API_TOKEN) },
      { name: "GLOBECONNECT", balance: balances.GLOBECONNECT, hasEnv: Boolean(process.env.GLOBECONNECT_API_KEY) },
      { name: "AJAH", balance: balances.AJAH, hasEnv: Boolean(process.env.AJAH_API_KEY) },
      { name: "VTPASS", balance: balances.VTPASS, hasEnv: Boolean(process.env.VTPASS_API_KEY) },
    ];

    let candidates = allProviders
      .filter((p) => p.hasEnv && p.balance >= numericAmount)
      .map((p) => p.name);

    if (candidates.length === 0) {
      candidates = allProviders.filter((p) => p.hasEnv).map((p) => p.name);
    }

    for (const provider of candidates) {
      try {
        console.log(`📡 [AIRTIME ROUTING]: Trying ${provider} for ₦${numericAmount} to ${targetPhone}...`);
        const resData = await dispatchAirtimeAPI({
          provider,
          network: normalizedNetwork,
          phone: targetPhone,
          amount: numericAmount,
          reference: txReference,
        });

        if (resData.success) {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "SUCCESSFUL",
              description: `Airtime NGN ${numericAmount} to ${targetPhone} delivered via ${provider}`,
            },
          });

          return res.status(200).json({
            status: "success",
            code: "TRANSACTION_SUCCESSFUL",
            route: provider,
            message: `NGN ${numericAmount} airtime successfully recharged to ${targetPhone}.`,
            data: {
              reference: txReference,
              network: normalizedNetwork,
              phone: targetPhone,
              faceValue: numericAmount,
              amountCharged: amountToCharge,
              discount: discountAmount,
              tier: userTier,
              walletBalance: updatedWallet.balance,
              providerResult: resData.raw,
            },
          });
        }
      } catch (err) {
        console.warn(`⚠️ [AIRTIME FAIL]: ${provider} failed: ${err.message}. Cascading to next provider...`);
        providerErrors.push(`${provider}: ${err.message}`);
      }
    }

    // 8. AUTO-REFUND NAN TAKE IDAN DUKKAN HANYOYI SUN FAƊI
    console.error("Airtime vending failed across all gateways and local modem. Refunding user...");

    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { increment: amountToCharge } },
      }),
      prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          status: "FAILED",
          description: `FAILED: Airtime NGN ${numericAmount} to ${targetPhone} (Refunded NGN ${amountToCharge})` 
        },
      }),
    ]);

    return res.status(502).json({
      status: "error",
      code: "PROVIDER_FAILURE",
      message: `Airtime vending failed across all available providers. Wallet balance has been refunded. Errors: ${providerErrors.join(" | ")}`,
    });

  } catch (error) {
    console.error("Airtime purchase error:", error);
    return res.status(500).json({
      status: "error",
      code: "SERVER_ERROR",
      message: "An error occurred while processing airtime purchase.",
      error: error.message,
    });
  }
};

/* ======================================================
   2. QUERY AIRTIME STATUS
====================================================== */
exports.checkAirtimeStatus = async (req, res) => {
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
        message: `No airtime transaction found with reference '${reference}'.`,
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        reference: transaction.reference,
        service: transaction.service,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("Check airtime status error:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to query airtime status.",
    });
  }
};

/* ======================================================
   3. GET AIRTIME TRANSACTION HISTORY
====================================================== */
exports.getAirtimeHistory = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;

    const history = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: "DEBIT",
        service: { contains: "AIRTIME" },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return res.status(200).json({
      status: "success",
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("Get airtime history error:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve airtime history.",
    });
  }
};