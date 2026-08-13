const prisma = require("../config/prisma");
const transactionService = require("./transaction.service");
const walletService = require("./wallet.service");
const providerService = require("./provider.service");
const apiUsageService = require("./apiUsage.service");
const calculateProfit = require("../helpers/calculateProfit");

exports.purchaseAirtime = async ({
  user,
  network,
  phone,
  amount,
}) => {
  const { provider, service } =
    await providerService.getProviderForService("airtime");

  const wallet = await walletService.getOrCreateWallet(user.id);

  if (wallet.balance < Number(amount)) {
    throw new Error("Insufficient wallet balance");
  }

  const transaction = await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "AIRTIME",
    amount,
    status: "PROCESSING",
    description: `${network} Airtime Purchase`,
  });

  try {
    /**
     * TODO:
     * Call real provider here:
     * VTpass / Reloadly / GSM Gateway
     */

    await walletService.debitWallet({
      userId: user.id,
      amount,
      reference: transaction.reference,
      description: `${network} Airtime Purchase to ${phone}`,
      module: "AIRTIME",
    });

    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "SUCCESSFUL",
      description: "Airtime purchase successful",
    });

    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/airtime",
      method: "POST",
      amount,
      status: "SUCCESSFUL",
    });

    const profit = calculateProfit({
      costPrice: Number(amount) * 0.97,
      sellingPrice: Number(amount),
    });

    return {
      success: true,
      reference: transaction.reference,
      provider: provider.name,
      service: service.name,
      network,
      phone,
      amount: Number(amount),
      profit,
    };
  } catch (error) {
    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "FAILED",
      description: error.message,
    });

    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/airtime",
      method: "POST",
      amount,
      status: "FAILED",
    });

    throw error;
  }
};

exports.getAirtimeTransactions = async (userId) => {
  return prisma.transaction.findMany({
    where: {
      userId,
      service: "AIRTIME",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};