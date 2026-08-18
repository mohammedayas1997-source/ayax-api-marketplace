const prisma = require("../lib/prisma");
const axios = require("axios");

/* ======================================================
   1. GET AVAILABLE DATA PLANS & MARKETPLACE PRICING

   GET /api/v1/data/plans
   Headers: { "x-api-key": "ayax_live_..." } ko Bearer Token
====================================================== */
exports.getDataPlans = async (req, res) => {
  try {
    const { network } = req.query;

    const whereClause = {
      type: "DATA",
      isActive: true,
    };

    if (network) {
      whereClause.network = String(network).toUpperCase();
    }

    const plans = await prisma.servicePlan.findMany({
      where: whereClause,
      select: {
        id: true,
        planCode: true,
        name: true,
        network: true,
        volume: true,
        validity: true,
        basePrice: true,
        apiPrice: true, // Farashin yan kasuwa/developers
        isActive: true,
      },
      orderBy: {
        apiPrice: "asc",
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Data plans retrieved successfully.",
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
   2. PURCHASE / DISPATCH DATA VIA MARKETPLACE API

   POST /api/v1/data/purchase
   Headers: { "x-api-key": "ayax_live_..." }
   Body: { network, phone, planCode, reference }
====================================================== */
exports.purchaseData = async (req, res) => {
  try {
    // req.user ko req.apiKeyUser (daga API key middleware)
    const user = req.user || req.apiKeyUser;
    const { network, phone, planCode, reference } = req.body;

    if (!network || !phone || !planCode) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "network, phone number, and planCode are required.",
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

    // 2. Nemo ainihin Plan ɗin a Database
    const plan = await prisma.servicePlan.findFirst({
      where: {
        planCode,
        network: String(network).toUpperCase(),
        isActive: true,
      },
    });

    if (!plan) {
      return res.status(404).json({
        status: "error",
        code: "PLAN_NOT_FOUND",
        message: `Plan with code '${planCode}' not found for network ${network}.`,
      });
    }

    const cost = Number(plan.apiPrice || plan.basePrice);

    // 3. Tabbatar da Wallet Balance na Developer
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient wallet balance. Please fund your Ayax Marketplace wallet.",
        currentBalance: wallet ? Number(wallet.balance) : 0,
        requiredAmount: cost,
      });
    }

    const txReference = reference || `AYAX_DATA_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 4. Rage Balance da Kirkirar PENDING Transaction
    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: {
          balance: { decrement: cost },
        },
      });

      const newTx = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DATA_PURCHASE",
          amount: cost,
          status: "PENDING",
          reference: txReference,
          metadata: {
            platform: "ayax_marketplace",
            network: String(network).toUpperCase(),
            phone,
            planCode,
            volume: plan.volume,
          },
        },
      });

      return { updatedWallet: newWallet, transaction: newTx };
    });

    // 5. Tura Request zuwa Provider (misali Ayax Data Xpress / Upstream Provider)
    let providerResponse;
    let isSuccess = false;

    try {
      // Misalin kiran upstream gateway:
      /*
      providerResponse = await axios.post(
        `${process.env.DATA_PROVIDER_URL}/api/v1/buy-data`,
        {
          network: plan.network,
          phone,
          plan: plan.planCode,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.DATA_PROVIDER_SECRET}`,
          },
        }
      );
      isSuccess = providerResponse.data?.status === "success";
      */

      // A halin yanzu (Mock/Direct success):
      isSuccess = true;
    } catch (upstreamErr) {
      console.error("Upstream Data Provider Error:", upstreamErr.message);
      isSuccess = false;
    }

    // 6. Tabbatar da Transaction ko Mayar da Kudi (Refund) idan ya gaza
    if (isSuccess) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "SUCCESS" },
      });

      return res.status(200).json({
        status: "success",
        code: "TRANSACTION_SUCCESSFUL",
        message: `Successfully delivered ${plan.name} to ${phone}.`,
        data: {
          reference: txReference,
          network: plan.network,
          phone,
          plan: plan.name,
          amountCharged: cost,
          walletBalance: updatedWallet.balance,
        },
      });
    } else {
      // Refund wallet idan upstream provider ya gaza
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED" },
        }),
      ]);

      return res.status(502).json({
        status: "error",
        code: "PROVIDER_FAILURE",
        message: "Failed to deliver data bundle. Your wallet has been refunded.",
      });
    }
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
   3. QUERY TRANSACTION STATUS (B2B STATUS CHECK)

   GET /api/v1/data/status/:reference
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
        amount: transaction.amount,
        status: transaction.status,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("Check data status error:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to query transaction status.",
    });
  }
};