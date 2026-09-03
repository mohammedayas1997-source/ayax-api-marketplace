const prisma = require("../config/prisma");
const axios = require("axios");

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
    const { network, phone, amount, reference } = req.body;

    const numericAmount = Number(amount);
    const normalizedNetwork = String(network || "").toUpperCase().trim();

    if (!normalizedNetwork || !phone || !numericAmount || numericAmount < 50) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Valid network, phone number, and minimum amount of NGN 50 are required.",
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
    const userTier = String(user.tier || user.role === "DEVELOPER" ? "STANDARD" : "REGULAR").toUpperCase();

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

    // 5. Cire Kuɗin Wallet da Adana Transaction (Daidai da Prisma Schema)
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
          description: `Airtime purchase of NGN ${numericAmount} to ${phone} (Charged: NGN ${amountToCharge})`,
        },
      });

      return { updatedWallet: newWallet, transaction: newTx };
    });

    // 6. Tura Request zuwa Upstream Gateway / GSM Modem
    let isSuccess = false;

    try {
      /*
      const upstreamRes = await axios.post(
        `${process.env.AIRTIME_PROVIDER_URL}/api/v1/topup`,
        { network: normalizedNetwork, phone, amount: numericAmount },
        { headers: { Authorization: `Bearer ${process.env.AIRTIME_PROVIDER_SECRET}` } }
      );
      isSuccess = upstreamRes.data?.status === "success";
      */

      // Mock Gateway Dispatch (A canza idan an haɗa live provider):
      isSuccess = true;
    } catch (upstreamErr) {
      console.error("Upstream Gateway Error:", upstreamErr.message);
      isSuccess = false;
    }

    // 7. Tabbatar da Nasara ko Mayar da Kuɗi (Refund)
    if (isSuccess) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "SUCCESSFUL" },
      });

      return res.status(200).json({
        status: "success",
        code: "TRANSACTION_SUCCESSFUL",
        message: `NGN ${numericAmount} airtime successfully recharged to ${phone}.`,
        data: {
          reference: txReference,
          network: normalizedNetwork,
          phone,
          faceValue: numericAmount,
          amountCharged: amountToCharge,
          discount: discountAmount,
          tier: userTier,
          walletBalance: updatedWallet.balance,
        },
      });
    } else {
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
            description: `FAILED: Airtime recharge of NGN ${numericAmount} to ${phone} (Refunded NGN ${amountToCharge})` 
          },
        }),
      ]);

      return res.status(502).json({
        status: "error",
        code: "PROVIDER_FAILURE",
        message: "Airtime vending failed. Your wallet balance has been refunded.",
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