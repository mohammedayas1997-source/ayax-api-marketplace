const prisma = require("../config/prisma");
const transactionService = require("./transaction.service");
const walletService = require("./wallet.service");
const providerService = require("./provider.service");
const apiUsageService = require("./apiUsage.service");
const calculateProfit = require("../helpers/calculateProfit");

const AIRTIME_DISCOUNTS = {
  MTN: 0.02,
  AIRTEL: 0.02,
  GLO: 0.03,
  "9MOBILE": 0.03,
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
  const amountToCharge = Number((numericAmount - discountAmount).toFixed(2));

  // 2. Nemo Provider da Service
  const { provider, service } = await providerService.getProviderForService("airtime");

  // 3. Duba Wallet Balance na Developer
  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < amountToCharge) {
    const err = new Error(
      `Insufficient wallet balance. Required: NGN ${amountToCharge}, Current Balance: NGN ${wallet.balance}`
    );
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
    reference: reference || `AIR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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

  let isDebited = false;

  try {
    // 5. Cire Kudin Wallet Cikin Kariya
    await walletService.debitWallet({
      userId: user.id,
      amount: amountToCharge,
      reference: transaction.reference,
      description: `${normalizedNetwork} Airtime purchase to ${phone}`,
      module: "AIRTIME",
    });
    isDebited = true;

    // 6. Kira Upstream Provider
    let providerResult = null;
    if (provider && typeof provider.buyAirtime === "function") {
      providerResult = await provider.buyAirtime({
        network: normalizedNetwork,
        phone,
        amount: numericAmount,
        reference: transaction.reference,
      });

      if (providerResult && providerResult.success === false) {
        throw new Error(providerResult.message || "Upstream provider transaction failed");
      }
    } else {
      console.warn("⚠️ No active upstream provider configured for airtime delivery.");
    }

    // 7. Update Transaction Status zuwa SUCCESSFUL
    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "SUCCESSFUL",
      description: "Airtime purchase successful",
    });

    // 8. Usage Log
    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/v1/airtime/buy",
      method: "POST",
      amount: amountToCharge,
      status: "SUCCESSFUL",
    });

    const costPrice = numericAmount * (1 - (discountRate + 0.01));
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
    console.error("❌ Airtime Delivery Failure:", error.message);

    // 9. Tabbatar da Auto-Refund idan an riga an cire kudi
    if (isDebited) {
      await walletService
        .creditWallet({
          userId: user.id,
          amount: amountToCharge,
          reference: `REF_${transaction.reference}`,
          description: `Auto-Refund for failed airtime: ${transaction.reference}`,
          module: "REFUND",
        })
        .catch((e) => console.error("Critical: Airtime refund failed:", e.message));
    }

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