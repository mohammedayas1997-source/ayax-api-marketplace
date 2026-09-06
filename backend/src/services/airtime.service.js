const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");
const axios = require("axios");

const DEFAULT_DISCOUNTS = {
  MTN: 0.02,
  AIRTEL: 0.02,
  GLO: 0.03,
  "9MOBILE": 0.03,
};

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

// Helper: Duba balance na kowane provider a lokacin da bukata ta taso
const getProviderBalances = async () => {
  const balances = {
    BILALSADA: 0,
    VTPASS: 0,
    SMARTSMS: 0,
    CLUBKONNECT: 0,
  };

  // 1. Bilalsadasub Balance
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

  // 2. VTpass Balance
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

  // 3. SmartSMS Balance
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

// Helper: Tura Airtime ta Provider da aka zaba
const dispatchAirtimeAPI = async ({ provider, network, phone, amount, reference }) => {
  const normNet = network.toUpperCase();

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

  throw new Error(`Unsupported provider: ${provider}`);
};

exports.purchaseAirtime = async ({ user, network, phone, amount, reference }) => {
  const numericAmount = Math.round(Number(amount));
  const normalizedNetwork = String(network || "MTN").toUpperCase().trim();
  const targetPhone = cleanLocalPhone(phone || "");

  if (!user || !user.id) {
    const error = new Error("Authentication is required.");
    error.statusCode = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  // 1. Idempotency Check
  if (reference) {
    const existingTx = await prisma.transaction.findUnique({
      where: { reference },
    });

    if (existingTx) {
      const error = new Error("A transaction with this reference has already been processed.");
      error.statusCode = 409;
      error.code = "DUPLICATE_REFERENCE";
      throw error;
    }
  }

  // 2. Lissafin Farashi bisa Tier
  const userTier = String(user.tier || "REGULAR").toUpperCase();

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

  let amountToCharge = numericAmount;
  let discountAmount = 0;

  if (pricingPlan && pricingPlan.sellingPrice > 0) {
    const rate = pricingPlan.sellingPrice <= 1
      ? pricingPlan.sellingPrice
      : pricingPlan.sellingPrice / 100;

    amountToCharge = Number((numericAmount * rate).toFixed(2));
    discountAmount = Number((numericAmount - amountToCharge).toFixed(2));
  } else {
    const fallbackRate = DEFAULT_DISCOUNTS[normalizedNetwork] || 0.02;
    discountAmount = Number((numericAmount * fallbackRate).toFixed(2));
    amountToCharge = Number((numericAmount - discountAmount).toFixed(2));
  }

  // 3. Duba Balance na Wallet na mai siye
  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  if (!wallet || Number(wallet.balance) < amountToCharge) {
    const error = new Error(`Insufficient wallet balance. Required: ₦${amountToCharge}`);
    error.statusCode = 402;
    error.code = "INSUFFICIENT_BALANCE";
    throw error;
  }

  const txReference = reference || `AIR_${normalizedNetwork}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // 4. Cire Kudi a Wallet da adana PENDING Transaction
  const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
    const newWallet = await tx.wallet.update({
      where: { userId: user.id },
      data: { balance: { decrement: amountToCharge } },
    });

    const newTx = await tx.transaction.create({
      data: {
        userId: user.id,
        type: "DEBIT",
        service: `${normalizedNetwork} AIRTIME`,
        amount: amountToCharge,
        status: "PENDING",
        reference: txReference,
        description: `₦${numericAmount} ${normalizedNetwork} Airtime to ${targetPhone} (Charged: ₦${amountToCharge})`,
      },
    });

    return { updatedWallet: newWallet, transaction: newTx };
  });

  // 5. SMART CASCADING VENDING (BILALSADA -> VTPASS -> SMARTSMS -> GATEWAY)
  const balances = await getProviderBalances();
  const providerErrors = [];

  // Shirya candidates wadanda balance dinsu ya isa kudin da za a tura
  const candidates = [
    { name: "BILALSADA", balance: balances.BILALSADA },
    { name: "VTPASS", balance: balances.VTPASS },
    { name: "SMARTSMS", balance: balances.SMARTSMS },
  ]
    .filter((p) => p.balance >= numericAmount)
    .map((p) => p.name);

  // Idan babu wanda ya nuna balance a API, saka duk wanda yake da token a env
  if (candidates.length === 0) {
    if (process.env.BILALSADA_API_TOKEN) candidates.push("BILALSADA");
    if (process.env.VTPASS_API_KEY) candidates.push("VTPASS");
    if (process.env.SMARTSMS_API_TOKEN) candidates.push("SMARTSMS");
  }

  for (const provider of candidates) {
    try {
      console.log(`📡 [AIRTIME ROUTING]: Trying ${provider} for ₦${numericAmount} to ${targetPhone}...`);
      const res = await dispatchAirtimeAPI({
        provider,
        network: normalizedNetwork,
        phone: targetPhone,
        amount: numericAmount,
        reference: txReference,
      });

      if (res.success) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESSFUL",
            description: `₦${numericAmount} ${normalizedNetwork} Airtime delivered via ${provider}`,
          },
        });

        return {
          reference: txReference,
          route: provider,
          network: normalizedNetwork,
          phone: targetPhone,
          faceValue: numericAmount,
          amountCharged: amountToCharge,
          discount: discountAmount,
          walletBalance: updatedWallet.balance,
          status: "SUCCESSFUL",
        };
      }
    } catch (err) {
      console.warn(`⚠️ [AIRTIME FAIL]: ${provider} failed: ${err.message}. Cascading to next...`);
      providerErrors.push(`${provider}: ${err.message}`);
    }
  }

  // 6. TAFARKI NA KARSHE: GSM GATEWAY (Idan dukkan APIs sun fadi ko babu kudi a wallets dinsu)
  const activeDevice = await prisma.gsmDevice.findFirst({
    where: {
      status: "ONLINE",
      lastSeen: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
    include: { sims: true },
    orderBy: { lastSeen: "desc" },
  });

  const targetSim = activeDevice?.sims?.find(
    (s) =>
      s.status === "ACTIVE" &&
      (s.carrierName?.toUpperCase().includes(normalizedNetwork) ||
       s.displayName?.toUpperCase().includes(normalizedNetwork))
  );

  if (activeDevice && targetSim) {
    const slotIndex = Number(targetSim.slotIndex ?? 0);
    const pin = process.env.GSM_AIRTIME_PIN || "1997";
    const momoPin = process.env.MOMO_PIN || "8724";

    let ussdCode = "*671#";
    let steps = [];

    if (normalizedNetwork === "MTN") {
      ussdCode = `*671*2*1*3*${targetPhone}*${numericAmount}*${momoPin}#`;
      steps = ["2", "1", "3", targetPhone, String(numericAmount), momoPin];
    } else if (normalizedNetwork === "AIRTEL") {
      ussdCode = `*321*${targetPhone}*${numericAmount}*${pin}#`;
      steps = [targetPhone, String(numericAmount), pin];
    } else if (normalizedNetwork === "GLO") {
      ussdCode = `*131*${targetPhone}*${numericAmount}*${pin}#`;
      steps = [targetPhone, String(numericAmount), pin];
    } else if (normalizedNetwork === "9MOBILE") {
      ussdCode = `*223*${pin}*${numericAmount}*${targetPhone}#`;
      steps = [pin, String(numericAmount), targetPhone];
    }

    const commandPayload = {
      reference: txReference,
      deviceId: activeDevice.id,
      type: "USSD",
      action: "USSD",
      service: "AIRTIME",
      code: ussdCode,
      ussd: ussdCode,
      ussdCode: ussdCode,
      steps,
      phone: targetPhone,
      targetPhone,
      slotIndex,
      simSlot: slotIndex,
      amount: numericAmount,
      network: normalizedNetwork,
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
      console.log(`⚡ [AIRTIME GSM GATEWAY FALLBACK] Ref: ${txReference} -> Code: ${ussdCode}`);
    } catch (socketErr) {
      console.warn("Gateway socket warning:", socketErr.message);
    }

    return {
      reference: txReference,
      route: "GSM_GATEWAY",
      network: normalizedNetwork,
      phone: targetPhone,
      faceValue: numericAmount,
      amountCharged: amountToCharge,
      discount: discountAmount,
      walletBalance: updatedWallet.balance,
      status: "PENDING",
    };
  }

  // 7. AUTO-REFUND NAN TAKE IDAN DUKKAN HANYOYI SUN GASA
  console.error("Airtime delivery failed across all gateways. Refunding user...");

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId: user.id },
      data: { balance: { increment: amountToCharge } },
    }),
    prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        description: `FAILED: Airtime ₦${numericAmount} to ${targetPhone} (Refunded ₦${amountToCharge})`,
      },
    }),
  ]);

  const error = new Error(`Airtime delivery failed. Gateways exhausted: ${providerErrors.join(" | ")}`);
  error.statusCode = 502;
  error.code = "GATEWAYS_EXHAUSTED";
  throw error;
};

exports.getAirtimeTransactions = async (userId) => {
  return await prisma.transaction.findMany({
    where: {
      userId,
      type: "DEBIT",
      service: { contains: "AIRTIME" },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
};