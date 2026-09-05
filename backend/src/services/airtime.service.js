const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");
const clubkonnect = require("./clubkonnect.service");

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

exports.purchaseAirtime = async ({ user, network, phone, amount, reference, channel = "DEFAULT" }) => {
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

  // 2. Lissafin Farashi bisa Tier (REGULAR, STANDARD, PREMIUM)
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

  // 3. Duba Balance na Wallet (Ba tare da cirewa ba tukuna)
  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  if (!wallet || Number(wallet.balance) < amountToCharge) {
    const error = new Error(`Insufficient wallet balance. Required: ₦${amountToCharge}`);
    error.statusCode = 402;
    error.code = "INSUFFICIENT_BALANCE";
    throw error;
  }

  // 4. PRE-FLIGHT CHECK: DUBA GSM MODEM & SIM KAFIN CIKAKKEN AIKI
  const activeDevice = await prisma.gsmDevice.findFirst({
    where: {
      status: "ONLINE",
      lastSeen: { gte: new Date(Date.now() - 2 * 60 * 1000) }, // Dole ya zama ONLINE a cikin minti 2
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

  const isGatewayReady = Boolean(activeDevice && targetSim);
  const isFallbackConfigured = Boolean(process.env.CLUBKONNECT_API_KEY || process.env.CLUBKONNECT_USER_ID);

  // Idan babu Gateway mai aiki kuma babu Clubkonnect, KADA A CIRE KUDI
  if (!isGatewayReady && !isFallbackConfigured) {
    const error = new Error(`${normalizedNetwork} airtime vending route is temporarily unavailable. No funds were debited.`);
    error.statusCode = 503;
    error.code = "ROUTE_UNAVAILABLE";
    throw error;
  }

  const txReference = reference || `AIRTIME_${normalizedNetwork}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // 5. CIRE KUDI A WALLET (Yanzu da aka tabbatar da cewa akwai kofa mai aiki)
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

  // 6. TAFARKI NA 1: GSM MODEM (GATEWAY tare da MoMo PSB)
  if (isGatewayReady) {
    const slotIndex = Number(targetSim.slotIndex ?? 0);
    const pin = process.env.GSM_AIRTIME_PIN || "1997";
    const momoPin = process.env.MOMO_PIN || pin;

    // Duba cunkoso a kan na'urar
    const pendingJobsCount = await prisma.gsmCommand.count({
      where: {
        deviceId: activeDevice.id,
        status: { in: ["PENDING", "PROCESSING"] },
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    const useMomo = channel === "MOMO" || process.env.DEFAULT_MTN_AIRTIME_ROUTE === "MOMO";
    let commandPayload = null;
    let socketPayload = null;

    // HANYA A: USSD FIRST (Load < 3)
    if (pendingJobsCount < 3) {
      let ussdCode = `*321*${targetPhone}*${numericAmount}*${pin}#`;
      let steps = [targetPhone, String(numericAmount), pin];

      if (normalizedNetwork === "MTN") {
        if (useMomo) {
          ussdCode = `*671*1*1*${targetPhone}*${numericAmount}*${momoPin}#`;
          steps = ["1", "1", targetPhone, String(numericAmount), momoPin];
        } else {
          ussdCode = `*321*1*${targetPhone}*${numericAmount}*${pin}#`;
          steps = ["1", targetPhone, String(numericAmount), pin];
        }
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

      commandPayload = {
        reference: txReference,
        deviceId: activeDevice.id,
        type: "USSD",
        service: "AIRTIME",
        ussdCode,
        code: ussdCode,
        steps,
        phone: targetPhone,
        targetPhone,
        slotIndex,
        simSlot: slotIndex,
        amount: numericAmount,
        network: normalizedNetwork,
        routeType: useMomo ? "MTN_MOMO" : "DIRECT_USSD",
      };

      socketPayload = {
        commandId: txReference,
        reference: txReference,
        type: "USSD",
        ussdCode,
        code: ussdCode,
        steps,
        slotIndex,
        simSlot: slotIndex,
        payload: commandPayload,
      };

      console.log(`⚡ [AIRTIME: USSD (${useMomo ? "MoMo" : "Standard"})] Ref: ${txReference} -> ${ussdCode} (Slot ${slotIndex})`);
    } 
    // HANYA B: SMS QUEUE (Load >= 3)
    else {
      let smsRecipient = "321";
      let smsMessage = `Transfer ${targetPhone} ${numericAmount} ${pin}`;

      if (normalizedNetwork === "MTN") {
        smsRecipient = "321";
        smsMessage = `Transfer ${targetPhone} ${numericAmount} ${pin}`;
      } else if (normalizedNetwork === "AIRTEL") {
        smsRecipient = "432";
        smsMessage = `2U ${targetPhone} ${numericAmount} ${pin}`;
      } else if (normalizedNetwork === "GLO") {
        smsRecipient = "131";
        smsMessage = `Transfer ${targetPhone} ${numericAmount} ${pin}`;
      } else if (normalizedNetwork === "9MOBILE") {
        smsRecipient = "223";
        smsMessage = `${pin} ${numericAmount} ${targetPhone}`;
      }

      commandPayload = {
        reference: txReference,
        deviceId: activeDevice.id,
        type: "SEND_SMS",
        action: "SEND_SMS",
        service: "AIRTIME",
        recipient: smsRecipient,
        sendTo: smsRecipient,
        destination: smsRecipient,
        phoneNumber: smsRecipient,
        phone: smsRecipient,
        message: smsMessage,
        smsBody: smsMessage,
        smsText: smsMessage,
        targetPhone,
        slotIndex,
        simSlot: slotIndex,
        amount: numericAmount,
        network: normalizedNetwork,
      };

      socketPayload = {
        commandId: txReference,
        reference: txReference,
        type: "SEND_SMS",
        action: "SEND_SMS",
        recipient: smsRecipient,
        sendTo: smsRecipient,
        message: smsMessage,
        smsBody: smsMessage,
        slotIndex,
        simSlot: slotIndex,
        payload: commandPayload,
      };

      console.log(`📨 [AIRTIME: SMS QUEUE] Ref: ${txReference} -> ${smsRecipient} "${smsMessage}" (Slot ${slotIndex})`);
    }

    await prisma.gsmCommand.create({
      data: {
        reference: txReference,
        deviceId: activeDevice.id,
        type: commandPayload.type,
        status: "PENDING",
        payload: commandPayload,
      },
    }).catch(() => null);

    try {
      emitEvent("gateway-command", socketPayload, activeDevice.id);
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

  // 7. TAFARKI NA 2: CLUBKONNECT FALLBACK
  console.log(`[AIRTIME: CLUBKONNECT] Forwarding ${txReference} to Clubkonnect API...`);

  try {
    const ckResult = await clubkonnect.vendAirtime({
      network: normalizedNetwork,
      phone: targetPhone,
      amount: numericAmount,
      reference: txReference,
    });

    if (ckResult.success) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "SUCCESSFUL" },
      });

      return {
        reference: txReference,
        route: "CLUBKONNECT",
        network: normalizedNetwork,
        phone: targetPhone,
        faceValue: numericAmount,
        amountCharged: amountToCharge,
        discount: discountAmount,
        walletBalance: updatedWallet.balance,
        status: "SUCCESSFUL",
      };
    } else {
      throw new Error(JSON.stringify(ckResult.rawResponse || "Clubkonnect rejected transaction"));
    }
  } catch (vendorError) {
    console.error("Vendor failed, initiating refund:", vendorError.message);

    // Auto-Refund nan take idan kofofi sun gaza bayan an cire kudi
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

    const error = new Error("Airtime delivery failed across all gateways. Wallet balance has been refunded.");
    error.statusCode = 502;
    error.code = "VENDOR_FAILURE";
    throw error;
  }
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