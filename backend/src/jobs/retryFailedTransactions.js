const prisma = require("../config/prisma");
const providerService = require("../services/provider.service");
const transactionService = require("../services/transaction.service");
const apiUsageService = require("../services/apiUsage.service");
const { emitEvent } = require("../config/socket");

const MAX_RETRIES = 3;

/**
 * ============================================
 * Retry One Transaction
 * ============================================
 */
const retryTransaction = async (transaction) => {
  try {
    if (
      transaction.retryCount >= MAX_RETRIES
    ) {
      return;
    }

    const provider =
      await providerService.getProviderForService(
        transaction.service
      );

    /**
     * TODO:
     * Call Provider Here
     */

    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "SUCCESSFUL",
      description: "Retried successfully",
    });

    await apiUsageService.createUsageLog({
      userId: transaction.userId,
      endpoint: transaction.service,
      method: "RETRY",
      amount: transaction.amount,
      status: "SUCCESSFUL",
    });

    emitEvent("transaction-retried", {
      reference: transaction.reference,
    });

  } catch (err) {

    await prisma.transaction.update({

      where: {
        id: transaction.id,
      },

      data: {

        retryCount: {
          increment: 1,
        },

        description: err.message,

      },

    });

  }
};

/**
 * ============================================
 * Retry Failed Transactions
 * ============================================
 */
exports.retryFailedTransactions =
  async () => {

    const failed =
      await prisma.transaction.findMany({

        where: {

          status: "FAILED",

          retryCount: {
            lt: MAX_RETRIES,
          },

        },

      });

    for (const trx of failed) {

      await retryTransaction(trx);

    }

    return {

      total: failed.length,

    };

};