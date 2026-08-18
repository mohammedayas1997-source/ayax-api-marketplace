const prisma = require("../lib/prisma");
const axios = require("axios");

// Discount kashi nawa ake baiwa API developers a kowane network (misali 2% ko 3%)
const AIRTIME_DISCOUNTS = {
  MTN: 0.02,     // 2% discount
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
    const normalizedNetwork = String(network || "").toUpperCase();

    if (!normalizedNetwork || !phone || !numericAmount || numericAmount < 50) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Valid network, phone number, and minimum amount of NGN 50 are required.",
      });
    }

    // 1. Hana Duplicate Transactions (Idempotency Check)
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

    // 2. Kididdigar Discount da ainihin kudin da za a caje Wallet
    const discountRate = AIRTIME_DISCOUNTS[normalizedNetwork] || 0.01;
    const discountAmount = numericAmount * discountRate;
    const amountToCharge = numericAmount - discountAmount;

    // 3. Tabbatar da Wallet Balance na Developer
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

    const txReference = reference || `AYAX_AIRTIME_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 4. Rage Balance da Adana PENDING Transaction a Database
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
          type: "AIRTIME_PURCHASE",
          amount: amountToCharge,
          status: "PENDING",
          reference: txReference,
          metadata: {
            platform: "ayax_marketplace",
            network: normalizedNetwork,
            phone,
            faceValue: numericAmount,
            discountApplied: discountAmount,
          },
        },
      });

      return { updatedWallet: newWallet, transaction: newTx };
    });

    // 5. Tura Request zuwa Upstream VTU Gateway
    let isSuccess = false;

    try {
      // Idan akwai upstream provider URL:
      /*
      const response = await axios.post(
        `${process.env.AIRTIME_PROVIDER_URL}/api/v1/topup`,
        {
          network: normalizedNetwork,
          phone,
          amount: numericAmount,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.AIRTIME_PROVIDER_SECRET}`,
          },
        }
      );
      isSuccess = response.data?.status === "success";
      */

      // Mock direct dispatch:
      isSuccess = true;
    } catch (upstreamErr) {
      console.error("Upstream Airtime Provider Error:", upstreamErr.message);
      isSuccess = false;
    }

    // 6. Tabbatar da Nasara ko Mayar da Kudi (Refund)
    if (isSuccess) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "SUCCESS" },
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
          walletBalance: updatedWallet.balance,
        },
      });
    } else {
      // Refund wallet idan recharge ya gaza
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: amountToCharge } },
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED" },
        }),
      ]);

      return res.status(502).json({
        status: "error",
        code: "PROVIDER_FAILURE",
        message: "Airtime vending failed. Your wallet has been refunded.",
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
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        metadata: transaction.metadata,
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
        type: "AIRTIME_PURCHASE",
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