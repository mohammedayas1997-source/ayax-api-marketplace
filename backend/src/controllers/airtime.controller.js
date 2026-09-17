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

// Helper: Tabbatar da tsarin Authorization Token na Al-Ihsan
const formatAlihsanAuth = (rawToken) => {
  if (!rawToken) return "";
  const token = String(rawToken).trim();
  return token.startsWith("Token ") ? token : `Token ${token}`;
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
  const rawAlihsanToken =
    process.env.ALIHSAN_AUTH_TOKEN ||
    process.env.ALIHSAN_API_KEY ||
    process.env.VTU_API_KEY ||
    "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x";

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
        timeout: 6000,
      });

      balances.ALIHSAN = Number(
        res.data?.user?.wallet_balance ||
        res.data?.wallet_balance ||
        res.data?.balance ||
        res.data?.user?.balance ||
        0
      );
    } catch (_) {
      try {
        const resOld = await axios.get("https://alihsandatasub.com.ng/api/v1/user.php", {
          headers: { Authorization: formatAlihsanAuth(rawAlihsanToken) },
          timeout: 4000,
        });
        balances.ALIHSAN = Number(
          resOld.data?.user?.wallet_balance ||
          resOld.data?.wallet_balance ||
          resOld.data?.balance ||
          0
        );
      } catch (errFallback) {
        balances.ALIHSAN = 0;
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

  // 4. BilalSada
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
  const normNet = String(network).toUpperCase().trim();
  const targetPhone = cleanLocalPhone(phone);
  const targetAmount = Number(amount);

  // 1. AL-IHSAN AIRTIME TOPUP
  if (provider === "ALIHSAN") {
    const netMap = { MTN: 1, GLO: 2, "9MOBILE": 3, AIRTEL: 4 };
    const rawAlihsanToken =
      process.env.ALIHSAN_AUTH_TOKEN ||
      process.env.ALIHSAN_API_KEY ||
      process.env.VTU_API_KEY ||
      "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x";

    const authHeader = formatAlihsanAuth(rawAlihsanToken);
    const baseUrl = process.env.ALIHSAN_BASE_URL || "https://alihsandatasub.com.ng/api";

    const res = await axios.post(
      `${baseUrl}/topup/`,
      {
        network: netMap[normNet] || 1,
        amount: targetAmount,
        mobile_number: targetPhone,
        Ported_number: true,
        airtime_type: "VTU",
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

    const statusText = String(res.data?.status || "").toLowerCase();
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
        phone: targetPhone,
        amount: targetAmount,
        ref: reference,
      },
      { timeout: 35000 }
    );
    if (res.data?.code === "1000" || res.data?.status === "success") {
      return { success: true, provider: "SMARTSMS", raw: res.data };
    }
    throw new Error(res.data?.message || "SmartSMS airtime dispatch failed");
  }

  // 3. CLUBCONNECT AIRTIME
  if (provider === "CLUBCONNECT") {
    const clubNetMap = { MTN: "01", GLO: "02", "9MOBILE": "03", AIRTEL: "04" };
    const userId = process.env.CLUBCONNECT_USER_ID;
    const apiKey = process.env.CLUBCONNECT_API_KEY;

    const url = `https://www.clubconnect.com.ng/api/airtime?UserID=${userId}&APIKey=${apiKey}&MobileNetwork=${clubNetMap[normNet] || "01"}&Amount=${targetAmount}&MobileNumber=${targetPhone}&RequestID=${reference}`;

    const res = await axios.get(url, { timeout: 35000 });
    const statusText = String(res.data?.status || res.data?.statuscode || "").toLowerCase();

    if (statusText.includes("success") || statusText === "100" || statusText === "200") {
      return { success: true, provider: "CLUBCONNECT", raw: res.data };
    }
    throw new Error(res.data?.msg || res.data?.status || "ClubConnect airtime dispatch failed");
  }

  // 4. BILALSADA AIRTIME
  if (provider === "BILALSADA") {
    const netMap = { MTN: 1, GLO: 2, "9MOBILE": 3, AIRTEL: 4 };
    const res = await axios.post(
      "https://bilalsadasub.com/api/topup",
      {
        network: netMap[normNet] || 1,
        amount: targetAmount,
        mobile_number: targetPhone,
        Ported_number: true,
        airtime_type: "VTU",
      },
      {
        headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
        timeout: 35000,
      }
    );
    if (res.data?.status === "success" || res.data?.status === "process") {
      return { success: true, provider: "BILALSADA", raw: res.data };
    }
    throw new Error(res.data?.message || "Bilalsadasub airtime dispatch failed");
  }

  // 5. GLOBECONNECT AIRTIME
  if (provider === "GLOBECONNECT") {
    const res = await axios.post(
      "https://api.globeconnect.ng/api/airtime",
      {
        network: normNet,
        amount: targetAmount,
        phone: targetPhone,
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
    throw new Error(res.data?.message || "GlobeConnect airtime dispatch failed");
  }

  // 6. AJAH AIRTIME
  if (provider === "AJAH") {
    const res = await axios.post(
      "https://ajah.com.ng/api/topup",
      {
        network_id: normNet.toLowerCase(),
        amount: targetAmount,
        phone_number: targetPhone,
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
    throw new Error(res.data?.message || "Ajah airtime dispatch failed");
  }

  // 7. VTPASS AIRTIME
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
        serviceID: serviceMap[normNet] || "glo",
        billersCode: targetPhone,
        amount: targetAmount,
        phone: targetPhone,
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
    throw new Error(res.data?.response_description || "VTpass airtime dispatch failed");
  }

  throw new Error(`Unsupported API airtime provider: ${provider}`);
};

/* ======================================================
   UNIVERSAL AIRTIME PURCHASE (HYBRID ROUTING)
====================================================== */
exports.purchaseAirtime = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const {
      network,
      phone,
      phoneNumber,
      amount,
      reference,
    } = req.body;

    const targetPhone = cleanLocalPhone(phoneNumber || phone || "");
    const resolvedNetwork = String(network || "MTN").toUpperCase().trim();
    const purchaseAmount = Number(amount);

    if (!targetPhone || targetPhone.length < 10) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "A valid recipient phone number is required.",
      });
    }

    if (!purchaseAmount || purchaseAmount < 50) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Minimum airtime amount allowed is ₦50.",
      });
    }

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required to purchase airtime.",
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

    // 2. Tabbatar da Kudin Wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < purchaseAmount) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient wallet balance to purchase airtime.",
        currentBalance: wallet ? Number(wallet.balance) : 0,
        requiredAmount: purchaseAmount,
      });
    }

    const txReference = reference || `AYAX_AIRTIME_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // 3. Cire Kudin Wallet da Bude Transaction
    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: purchaseAmount } },
      });

      const newTx = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEBIT",
          service: `${resolvedNetwork} AIRTIME`,
          amount: purchaseAmount,
          status: "PENDING",
          reference: txReference,
          description: `₦${purchaseAmount} ${resolvedNetwork} Airtime to ${targetPhone}`,
        },
      });

      return { updatedWallet: newWallet, transaction: newTx };
    });

    // 4. ROUTE 1: GSM MODEM GATEWAY (USSD VENDING DA GANGAN)
    let activeDevice = null;
    let targetSim = null;

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

    if (activeDevice && targetSim) {
      const slotIndex = Number(targetSim.slotIndex ?? 0);
      const pin = process.env.GSM_AIRTIME_PIN || "1997";

      let ussdCode = "";
      if (resolvedNetwork === "MTN") {
        ussdCode = `*321*1*${targetPhone}*${purchaseAmount}*${pin}#`;
      } else if (resolvedNetwork === "AIRTEL") {
        ussdCode = `*432*1*${targetPhone}*${purchaseAmount}*${pin}#`;
      } else if (resolvedNetwork === "GLO") {
        ussdCode = `*131*${targetPhone}*${purchaseAmount}*${pin}#`;
      }

      if (ussdCode) {
        const commandPayload = {
          reference: txReference,
          commandId: txReference,
          id: txReference,
          deviceId: activeDevice.id,
          type: "SEND_USSD",
          action: "SEND_USSD",
          service: "AIRTIME",
          ussdCode: ussdCode,
          code: ussdCode,
          targetPhone,
          slotIndex,
          simSlot: slotIndex,
          amount: purchaseAmount,
          network: resolvedNetwork,
        };

        await prisma.gsmCommand.create({
          data: {
            reference: txReference,
            deviceId: activeDevice.id,
            type: "SEND_USSD",
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
        } catch (socketErr) {
          console.warn("Socket emission error:", socketErr.message);
        }

        return res.status(200).json({
          status: "success",
          code: "TRANSACTION_QUEUED",
          route: "GSM_GATEWAY",
          message: `Airtime purchase queued on local modem for ${targetPhone}.`,
          data: {
            reference: txReference,
            network: resolvedNetwork,
            phone: targetPhone,
            amountCharged: purchaseAmount,
            walletBalance: updatedWallet.balance,
          },
        });
      }
    }

    // 5. ROUTE 2: SMART CASCADING API (ALIHSAN DA SAURAN PROVIDERS)
    const balances = await getProviderBalances();
    const providerErrors = [];

    const hasAlIhsan = Boolean(
      process.env.ALIHSAN_AUTH_TOKEN ||
      process.env.ALIHSAN_API_KEY ||
      process.env.VTU_API_KEY ||
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
      .filter((p) => p.hasEnv && p.balance >= purchaseAmount)
      .map((p) => p.name);

    if (candidates.length === 0) {
      candidates = allProviders.filter((p) => p.hasEnv).map((p) => p.name);
    }

    for (const provider of candidates) {
      try {
        console.log(`🌐 [AIRTIME ROUTING]: Trying ${provider} for ₦${purchaseAmount} to ${targetPhone}... (Balance: ₦${balances[provider]})`);
        const resData = await dispatchAirtimeAPI({
          provider,
          network: resolvedNetwork,
          phone: targetPhone,
          amount: purchaseAmount,
          reference: txReference,
        });

        if (resData.success) {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "SUCCESSFUL",
              description: `₦${purchaseAmount} ${resolvedNetwork} Airtime to ${targetPhone} via ${provider}`,
            },
          });

          return res.status(200).json({
            status: "success",
            code: "PURCHASE_SUCCESSFUL",
            route: provider,
            message: `₦${purchaseAmount} Airtime successfully credited to ${targetPhone} via ${provider}.`,
            data: {
              reference: txReference,
              network: resolvedNetwork,
              phone: targetPhone,
              amountCharged: purchaseAmount,
              walletBalance: updatedWallet.balance,
              providerResult: resData.raw,
            },
          });
        }
      } catch (err) {
        console.warn(`⚠️ [AIRTIME API FAIL]: ${provider} - ${err.message}. Cascading to next provider...`);
        providerErrors.push(`${provider}: ${err.message}`);
      }
    }

    // 6. AUTO-REFUND NAN TAKE IDAN DUKKAN PROVIDERS SUN GASA
    console.error("Airtime purchase failed across all routes, refunding user...");

    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { increment: purchaseAmount } },
      }),
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          description: `FAILED: ₦${purchaseAmount} to ${targetPhone} (Refunded ₦${purchaseAmount})`,
        },
      }),
    ]);

    return res.status(502).json({
      status: "error",
      code: "VENDOR_ERROR",
      message: `Airtime delivery failed. Gateways exhausted: ${providerErrors.join(" | ")}. ₦${purchaseAmount} has been refunded back to your wallet.`,
    });
  } catch (error) {
    console.error("Airtime purchase error:", error);
    return res.status(500).json({
      status: "error",
      code: "SERVER_ERROR",
      message: "An error occurred while processing airtime request.",
      error: error.message,
    });
  }
};