const prisma = require("../config/prisma");
const transactionService = require("./transaction.service");
const walletService = require("./wallet.service");
const providerService = require("./provider.service");
const apiUsageService = require("./apiUsage.service");
const calculateProfit = require("../helpers/calculateProfit");

/* ======================================================
   1. PURCHASE DATA BUNDLE (B2B API & MOBILE APP SERVICE)
====================================================== */
exports.purchaseData = async ({
  user,
  apiKey,
  network,
  planCode,
  phone,
  phoneNumber,
  amount,
  reference,
}) => {
  const targetPhone = String(phone || phoneNumber || "").trim();
  const resolvedNetwork = String(network || "MTN").toUpperCase();

  // 1. Nemi ainihin Plan da farashinsa
  const plan = await prisma.servicePlan?.findFirst({
    where: {
      planCode: String(planCode).trim(),
      network: resolvedNetwork,
      isActive: true,
    },
  }).catch(() => null);

  const finalAmount = Number(amount || plan?.apiPrice || plan?.userPrice || plan?.basePrice || 0);

  if (!finalAmount || finalAmount <= 0) {
    const err = new Error("Invalid plan amount or plan code not found.");
    err.statusCode = 400;
    err.code = "INVALID_PLAN_AMOUNT";
    throw err;
  }

  // 2. Tabbatar da Wallet Balance
  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < finalAmount) {
    const err = new Error("Insufficient wallet balance.");
    err.statusCode = 402;
    err.code = "INSUFFICIENT_WALLET_BALANCE";
    throw err;
  }

  // 3. Create Transaction Record
  const transaction = await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "DATA",
    amount: finalAmount,
    reference: reference || undefined,
    status: "PROCESSING",
    description: `${resolvedNetwork} Data Purchase (${planCode}) to ${targetPhone}`,
    metadata: {
      network: resolvedNetwork,
      phone: targetPhone,
      planCode,
      apiKeyId: apiKey?.id,
    },
  });

  // 4. Debit Wallet (Hold Funds)
  await walletService.debitWallet({
    userId: user.id,
    amount: finalAmount,
    reference: transaction.reference,
    description: `${resolvedNetwork} Data Purchase`,
    module: "DATA",
  });

  try {
// 5. Dauko Provider tare da Cikakken Fallback zuwa GSM Gateway
    let provider = null;
    let service = null;

    try {
      const providerData = await providerService.getProviderForService("data");
      provider = providerData.provider;
      service = providerData.service;
    } catch (e) {
      try {
        const fallbackData = await providerService.getProviderForService("gsm_gateway");
        provider = fallbackData.provider;
        service = fallbackData.service;
      } catch (err2) {
        const airtimeData = await providerService.getProviderForService("airtime").catch(() => null);
        provider = airtimeData?.provider;
      }
    }

    // Tace lambar MB ta USSD (misali 500, 1000, 2000, 5000)
    let raw = String(planCode || "1000").toUpperCase();
    let numericMB = "1000";
    if (raw.includes("500")) numericMB = "500";
    else if (raw.includes("1GB") || raw.includes("1000")) numericMB = "1000";
    else if (raw.includes("2GB") || raw.includes("2000")) numericMB = "2000";
    else if (raw.includes("3GB") || raw.includes("3000")) numericMB = "3000";
    else if (raw.includes("5GB") || raw.includes("5000")) numericMB = "5000";
    else {
      numericMB = raw.replace(/[^0-9]/g, "") || "1000";
    }

    const ussdCode = `*312*${targetPhone}*${numericMB}*1997#`;

    // 6. TURA DATA ZUWA GATEWAY (Tare da duk wata hanya da provider zai iya karba)
    let providerResult = null;

    if (provider && typeof provider.buyData === "function") {
      providerResult = await provider.buyData({
        network: resolvedNetwork,
        planCode: numericMB,
        planSize: numericMB,
        phone: targetPhone,
        phoneNumber: targetPhone,
        amount: finalAmount,
        reference: transaction.reference,
        ussdCode,
      });
    } else if (provider && typeof provider.buyAirtime === "function") {
      // Idan babu buyData, tura ta buyAirtime na gateway domin yayi amfani da USSD
      providerResult = await provider.buyAirtime({
        network: resolvedNetwork,
        phone: targetPhone,
        phoneNumber: targetPhone,
        amount: finalAmount,
        reference: transaction.reference,
        ussdCode,
        code: ussdCode,
      });
    } else if (provider && typeof provider.sendUssdCommand === "function") {
      providerResult = await provider.sendUssdCommand({
        network: resolvedNetwork,
        phone: targetPhone,
        ussdCode,
        reference: transaction.reference,
      });
    } else {
      console.warn("⚠️ No active provider method found, falling back to direct GSM queue.");
    }

    // 7. Usage Log
    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/v1/data/buy",
      method: "POST",
      amount: finalAmount,
      status: "PROCESSING",
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
      network: resolvedNetwork,
      phone: targetPhone,
      planCode: numericMB,
      amount: finalAmount,
      provider: provider?.name || "GSM_GATEWAY",
      service: service?.name || "DATA_TOPUP",
      profit,
      providerResult,
    };
  } catch (err) {
    // 9. Idan Provider ya yi fail, yi REFUND na kudin wallet nan take
    await walletService.creditWallet({
      userId: user.id,
      amount: finalAmount,
      reference: `REFUND_${transaction.reference}`,
      description: `Refund for failed data purchase: ${transaction.reference}`,
      module: "REFUND",
    }).catch((e) => console.error("Refund failed:", e));

    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "FAILED",
      description: err.message || "Provider vending error",
    });

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
},

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