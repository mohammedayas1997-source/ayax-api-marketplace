const prisma = require("../config/prisma");
const { emitEvent, emitGatewayCommand } = require("../config/socket");
const clubkonnect = require("./clubkonnect.service");

const DEFAULT_DISCOUNTS = {
  MTN: 0.02,
  AIRTEL: 0.02,
  GLO: 0.03,
  "9MOBILE": 0.03,
};

exports.purchaseAirtime = async ({ user, network, phone, amount, reference }) => {
  const numericAmount = Number(amount);
  const normalizedNetwork = String(network || "").toUpperCase().trim();
  const targetPhone = String(phone || "").trim();

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
    const fallbackRate = DEFAULT_DISCOUNTS[normalizedNetwork] || 0.01;
    discountAmount = Number((numericAmount * fallbackRate).toFixed(2));
    amountToCharge = Number((numericAmount - discountAmount).toFixed(2));
  }

  // 3. Duba Balance na Wallet
  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  if (!wallet || Number(wallet.balance) < amountToCharge) {
    const error = new Error(`Insufficient wallet balance. Required: ₦${amountToCharge}`);
    error.statusCode = 402;
    error.code = "INSUFFICIENT_BALANCE";
    throw error;
  }

  const txReference = reference || `AIRTIME_${normalizedNetwork}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // 4. Cire Kudi a Wallet & Ajiye Transaction a PENDING
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

  // 5. TAFARKI NA 1: GSM MODEM (GATEWAY)
  const activeDevice = await prisma.gsmDevice.findFirst({
    where: { status: "ONLINE" },
    include: { sims: true },
    orderBy: { lastSeen: "desc" },
  });

  const targetSim = activeDevice?.sims?.find(
    (s) =>
      s.carrierName?.toUpperCase().includes(normalizedNetwork) ||
      s.displayName?.toUpperCase().includes(normalizedNetwork)
  );

  if (activeDevice && targetSim) {
    const slotIndex = targetSim.slotIndex ?? 1;
    const pin = "1997";

    let ussdCode = `*321*${targetPhone}*${numericAmount}*${pin}#`;
    let steps = [targetPhone, String(numericAmount), pin];

    if (normalizedNetwork === "MTN") {
      ussdCode = `*600*${targetPhone}*${numericAmount}*${pin}#`;
    } else if (normalizedNetwork === "AIRTEL") {
      ussdCode = `*432*1*${targetPhone}*${numericAmount}*${pin}#`;
    } else if (normalizedNetwork === "GLO") {
      ussdCode = `*131*${targetPhone}*${numericAmount}*${pin}#`;
    } else if (normalizedNetwork === "9MOBILE") {
      ussdCode = `*223*${pin}*${numericAmount}*${targetPhone}#`;
    }

    const commandPayload = {
      reference: txReference,
      deviceId: activeDevice.id,
      type: "USSD",
      service: "AIRTIME",
      ussdCode,
      steps,
      phone: targetPhone,
      slotIndex: Number(slotIndex),
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
      if (typeof emitGatewayCommand === "function") {
        emitGatewayCommand(activeDevice.id, commandPayload);
      }
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

  // 6. TAFARKI NA 2: CLUBKONNECT FALLBACK
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

    // Reversal / Refund
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