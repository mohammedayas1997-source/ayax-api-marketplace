const prisma = require("../config/prisma");
const transactionService = require("./transaction.service");
const walletService = require("./wallet.service");
const providerService = require("./provider.service");
const apiUsageService = require("./apiUsage.service");
const calculateProfit = require("../helpers/calculateProfit");

// Rangwame ga developers (B2B discount)
const AIRTIME_DISCOUNTS = {
  MTN: 0.02,     // 2% discount
  AIRTEL: 0.02,  // 2% discount
  GLO: 0.03,     // 3% discount
  "9MOBILE": 0.03 // 3% discount
};

/* ======================================================
   1. PURCHASE AIRTIME (B2B API SERVICE)
====================================================== */
exports.purchaseAirtime = async ({
  user,
  apiKey,
  network,
  phone,
  amount,
  reference,
}) => {
  const numericAmount = Number(amount);
  const normalizedNetwork = String(network || "").toUpperCase();

  if (!numericAmount || numericAmount < 50) {
    const err = new Error("Minimum airtime purchase amount is NGN 50.");
    err.statusCode = 400;
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  // 1. Lissafin Discount da Ainihin Kudin Caji
  const discountRate = AIRTIME_DISCOUNTS[normalizedNetwork] || 0.01;
  const discountAmount = numericAmount * discountRate;
  const amountToCharge = numericAmount - discountAmount;

  // 2. Nemo Provider da Service
  const { provider, service } = await providerService.getProviderForService("airtime");

  // 3. Duba Wallet Balance na Developer
  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < amountToCharge) {
    const err = new Error("Insufficient wallet balance.");
    err.statusCode = 402;
    err.code = "INSUFFICIENT_WALLET_BALANCE";
    throw err;
  }

  // 4. Kirkiri Transaction Record (PROCESSING)
  const transaction = await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "AIRTIME",
    amount: amountToCharge,
    reference: reference || undefined,
    status: "PROCESSING",
    description: `${normalizedNetwork} NGN ${numericAmount} Airtime Topup to ${phone}`,
    metadata: {
      network: normalizedNetwork,
      phone,
      faceValue: numericAmount,
      discountApplied: discountAmount,
      apiKeyId: apiKey?.id,
    },
  });

  // 5. Cire Kudin Wallet da Farko (Hold Funds)
  await walletService.debitWallet({
    userId: user.id,
    amount: amountToCharge,
    reference: transaction.reference,
    description: `${normalizedNetwork} Airtime purchase to ${phone}`,
    module: "AIRTIME",
  });

  try {
    /**
     * =====================================
     * CALL UPSTREAM AIRTIME PROVIDER HERE
     * =====================================
     */
    let providerResult = null;
    if (provider && typeof provider.buyAirtime === "function") {
      providerResult = await provider.buyAirtime({
        network: normalizedNetwork,
        phone,
        amount: numericAmount,
        reference: transaction.reference,
      });
    }

    // 6. Update Transaction Status zuwa SUCCESSFUL
    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "SUCCESSFUL",
      description: "Airtime purchase successful",
    });

    // 7. Usage Log
    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/v1/airtime/buy",
      method: "POST",
      amount: amountToCharge,
      status: "SUCCESSFUL",
    });

    // 8. Lissafin Riba (Profit)
    const costPrice = numericAmount * (1 - (discountRate + 0.01)); // Ribar kamfani
    const profit = calculateProfit({
      costPrice,
      sellingPrice: amountToCharge,
    });

    return {
      success: true,
      reference: transaction.reference,
      network: normalizedNetwork,
      phone,
      faceValue: numericAmount,
      amountCharged: amountToCharge,
      discount: discountAmount,
      provider: provider?.name || "AYAX_INTERNAL",
      service: service?.name || "AIRTIME_TOPUP",
      profit,
    };
  } catch (error) {
    // 9. Idan Provider ya samu matsala, yi REFUND kai tsaye
    await walletService.creditWallet({
      userId: user.id,
      amount: amountToCharge,
      reference: `REFUND_${transaction.reference}`,
      description: `Refund for failed airtime recharge: ${transaction.reference}`,
      module: "REFUND",
    }).catch((e) => console.error("Airtime refund error:", e));

    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "FAILED",
      description: error.message || "Airtime provider error",
    });

    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/v1/airtime/buy",
      method: "POST",
      amount: amountToCharge,
      status: "FAILED",
    });

    const err = new Error(error.message || "Airtime delivery failed.");
    err.statusCode = error.statusCode || 502;
    err.code = error.code || "AIRTIME_PROVIDER_FAILED";
    throw err;
  }
};

/* ======================================================
   2. GET AIRTIME TRANSACTIONS
====================================================== */
exports.getAirtimeTransactions = async (userId) => {
  return prisma.transaction.findMany({
    where: {
      userId,
      service: "AIRTIME",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
};