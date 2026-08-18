const prisma = require("../config/prisma");
const transactionService = require("./transaction.service");
const walletService = require("./wallet.service");
const providerService = require("./provider.service");
const apiUsageService = require("./apiUsage.service");
const calculateProfit = require("../helpers/calculateProfit");

/* ======================================================
   1. PURCHASE DATA BUNDLE (B2B API SERVICE)
====================================================== */
exports.purchaseData = async ({
  user,
  apiKey,
  network,
  planCode,
  phone,
  amount,
  reference,
}) => {
  // 1. Nemi ainihin Plan da farashinsa idan ba a turo amount ba
  const plan = await prisma.servicePlan?.findFirst({
    where: {
      planCode,
      network: network.toUpperCase(),
      isActive: true,
    },
  }).catch(() => null);

  const finalAmount = Number(amount || plan?.apiPrice || plan?.basePrice || 0);

  if (!finalAmount || finalAmount <= 0) {
    const err = new Error("Invalid plan amount or plan code not found.");
    err.statusCode = 400;
    err.code = "INVALID_PLAN_AMOUNT";
    throw err;
  }

  // 2. Get Provider & Service
  const { provider, service } = await providerService.getProviderForService("data");

  // 3. Wallet Check
  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < finalAmount) {
    const err = new Error("Insufficient wallet balance.");
    err.statusCode = 402;
    err.code = "INSUFFICIENT_WALLET_BALANCE";
    throw err;
  }

  // 4. Create Transaction Record
  const transaction = await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "DATA",
    amount: finalAmount,
    reference: reference || undefined,
    status: "PROCESSING",
    description: `${network} Data Purchase (${planCode}) to ${phone}`,
    metadata: {
      network,
      phone,
      planCode,
      apiKeyId: apiKey?.id,
    },
  });

  // 5. Debit Wallet da Farko (Hold Funds)
  await walletService.debitWallet({
    userId: user.id,
    amount: finalAmount,
    reference: transaction.reference,
    description: `${network} Data Purchase`,
    module: "DATA",
  });

  try {
    /**
     * =====================================
     * CALL UPSTREAM PROVIDER HERE
     * =====================================
     */
    let providerResult = null;
    if (provider && typeof provider.buyData === "function") {
      providerResult = await provider.buyData({
        network,
        planCode,
        phone,
        reference: transaction.reference,
      });
    }

    // 6. Update Transaction to SUCCESSFUL
    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "SUCCESSFUL",
      description: "Data purchase successful",
    });

    // 7. Usage Log
    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/v1/data/buy",
      method: "POST",
      amount: finalAmount,
      status: "SUCCESSFUL",
    });

    // 8. Calculate Profit
    const costPrice = plan?.costPrice || finalAmount * 0.97;
    const profit = calculateProfit({
      costPrice,
      sellingPrice: finalAmount,
    });

    return {
      success: true,
      reference: transaction.reference,
      network,
      phone,
      planCode,
      amount: finalAmount,
      provider: provider?.name || "AYAX_INTERNAL",
      service: service?.name || "DATA_TOPUP",
      profit,
    };
  } catch (err) {
    // 9. Idan Provider ya yi fail, yi REFUND na kudin wallet
    await walletService.creditWallet({
      userId: user.id,
      amount: finalAmount,
      reference: `REFUND_${transaction.reference}`,
      description: `Refund for failed data purchase: ${transaction.reference}`,
      module: "REFUND",
    }).catch((e) => console.error("Refund failed:", e));

    // Update transaction to FAILED
    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "FAILED",
      description: err.message || "Provider vending error",
    });

    // API Usage Failed Log
    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/v1/data/buy",
      method: "POST",
      amount: finalAmount,
      status: "FAILED",
    });

    const error = new Error(err.message || "Data provider failure.");
    error.statusCode = err.statusCode || 502;
    error.code = err.code || "PROVIDER_DELIVERY_FAILED";
    throw error;
  }
};

/* ======================================================
   2. GET DATA TRANSACTIONS
====================================================== */
exports.getDataTransactions = async (userId) => {
  return prisma.transaction.findMany({
    where: {
      userId,
      service: "DATA",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
};

/* ======================================================
   3. GET AVAILABLE PLANS (CATALOG)
====================================================== */
exports.getDataPlans = async (network) => {
  const whereClause = {
    type: "DATA",
    isActive: true,
  };

  if (network) {
    whereClause.network = String(network).toUpperCase();
  }

  // Idan kana da ServicePlan model a schema.prisma:
  if (prisma.servicePlan) {
    return prisma.servicePlan.findMany({
      where: whereClause,
      select: {
        id: true,
        planCode: true,
        name: true,
        network: true,
        volume: true,
        validity: true,
        apiPrice: true,
        basePrice: true,
      },
      orderBy: {
        apiPrice: "asc",
      },
    });
  }

  return [];
};