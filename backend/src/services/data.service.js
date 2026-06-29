const prisma = require("../config/prisma");
const transactionService = require("./transaction.service");
const walletService = require("./wallet.service");
const providerService = require("./provider.service");
const apiUsageService = require("./apiUsage.service");
const calculateProfit = require("../helpers/calculateProfit");

exports.purchaseData = async ({
  user,
  network,
  planCode,
  phone,
  amount,
}) => {
  // 1. Get Provider & Service
  const { provider, service } =
    await providerService.getProviderForService("data");

  // 2. Wallet Check
  const wallet = await walletService.getOrCreateWallet(
    user.id
  );

  if (wallet.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  // 3. Create Transaction
  const transaction =
    await transactionService.createTransaction({
      userId: user.id,
      type: "DEBIT",
      service: "DATA",
      amount,
      status: "PROCESSING",
      description: `${network} Data Purchase`,
    });

  try {

    /**
     * =====================================
     * CALL PROVIDER HERE
     * (VTpass / Reloadly / SME Provider)
     * =====================================
     */

    // TODO:
    // await provider.buyData(...)

    // 4. Debit Wallet
    await walletService.debitWallet({
      userId: user.id,
      amount,
      reference: transaction.reference,
      description: `${network} Data Purchase`,
      module: "DATA",
    });

    // 5. Update Transaction
    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "SUCCESSFUL",
      description: "Data purchase successful",
    });

    // 6. Usage Log
    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/data",
      method: "POST",
      amount,
      status: "SUCCESSFUL",
    });

    // 7. Profit
    const profit = calculateProfit({
      costPrice: amount * 0.95,
      sellingPrice: amount,
    });

    return {
      success: true,
      reference: transaction.reference,
      provider: provider.name,
      service: service.name,
      profit,
    };

  } catch (err) {

    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "FAILED",
      description: err.message,
    });

    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/data",
      method: "POST",
      amount,
      status: "FAILED",
    });

    throw err;
  }
};

exports.getDataTransactions = async (userId) => {
  return prisma.transaction.findMany({
    where: {
      userId,
      service: "DATA",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

exports.getAvailablePlans = async (network) => {

  /**
   * TODO
   * Provider API
   */

  return [];
};