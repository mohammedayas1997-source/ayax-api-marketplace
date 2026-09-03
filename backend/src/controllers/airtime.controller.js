const prisma = require("../config/prisma");
const { emitEvent, emitGatewayCommand } = require("../config/socket");
const clubkonnect = require("../services/clubkonnect.service");

// Tsoffin discounts a matsayin madogara (Fallback) idan ba a saita a Database ba
const DEFAULT_DISCOUNTS = {
  MTN: 0.02,     // 2% discount (₦98 a kowane ₦100)
  AIRTEL: 0.02,  // 2% discount
  GLO: 0.03,     // 3% discount
  "9MOBILE": 0.03 // 3% discount
};

/* ======================================================
   1. PURCHASE AIRTIME VIA MARKETPLACE API

   POST /api/v1/airtime/purchase
   Headers: { "x-api-key": "ayax_live_..." } ko Bearer JWT
   Body: { network, phone, amount, reference }
====================================================== */
exports.purchaseAirtime = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const { network, phone, phoneNumber, amount, reference } = req.body;

    const targetPhone = String(phoneNumber || phone || "").trim();
    const numericAmount = Number(amount);
    const normalizedNetwork = String(network || "").toUpperCase().trim();

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
      // Idan an saita misali ₦98 a kowane ₦100 (sellingPrice = 98 ko 0.98)
      const rate = pricingPlan.sellingPrice <= 1 
        ? pricingPlan.sellingPrice 
        : (pricingPlan.sellingPrice / 100);
      
      amountToCharge = Number((numericAmount * rate).toFixed(2));
      discountAmount = Number((numericAmount - amountToCharge).toFixed(2));
    } else {
      // Idan babu a database, yi amfani da default rate
      const fallbackRate = DEFAULT_DISCOUNTS[normalizedNetwork] || 0.01;
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

    const txReference =
      reference || `AYAX_AIR_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // 5. Cire Kuɗin Wallet da Adana Transaction a PENDING
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

    // 6. ROUTE 1: DUBA GSM GATEWAY / MODEM
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
      const pin = "1997"; // GSM Modem transfer pin

      // Standard NCC Airtime Transfer USSD Commands (*321# ko *600#)
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
        console.warn("Gateway socket broadcast warning:", socketErr.message);
      }

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
    }

    // 7. ROUTE 2: FALLBACK ZUWA CLUBKONNECT (Idan Babu Modem ko Ba ya Aiki)
    console.log(`[AIRTIME: CLUBKONNECT] Modem offline. Forwarding ${txReference} to Clubkonnect API...`);

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

        return res.status(200).json({
          status: "success",
          code: "TRANSACTION_SUCCESSFUL",
          route: "CLUBKONNECT",
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
          },
        });
      } else {
        throw new Error(JSON.stringify(ckResult.rawResponse || "Clubkonnect failed to process airtime"));
      }
    } catch (upstreamErr) {
      console.error("Clubkonnect Airtime Error, initiating refund:", upstreamErr.message);

      // Reversal / Refund nan take
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: amountToCharge } },
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { 
            status: "FAILED",
            description: `FAILED: Airtime recharge of NGN ${numericAmount} to ${targetPhone} (Refunded NGN ${amountToCharge})` 
          },
        }),
      ]);

      return res.status(502).json({
        status: "error",
        code: "PROVIDER_FAILURE",
        message: "Airtime vending failed across all available providers. Your wallet balance has been refunded.",
      });
    }
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

   GET /api/v1/airtime/status/:reference
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

   GET /api/v1/airtime/history
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