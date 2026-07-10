const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

/**
 * Update GSM command status
 */
async function updateCommand(reference, status, response = null) {
  const command = await prisma.gsmCommand.update({
    where: {
      reference,
    },
    data: {
      status,
      response,
      updatedAt: new Date(),
    },
  });

  emitEvent("gsm-command-updated", command);

  return command;
}

/**
 * Update transaction status
 */
async function updateTransaction(reference, status, response = null) {
  const transaction = await prisma.transaction.updateMany({
    where: {
      reference,
    },
    data: {
      status,
      response,
      updatedAt: new Date(),
    },
  });

  emitEvent("transaction-updated", {
    reference,
    status,
    response,
  });

  return transaction;
}

/**
 * Refund user wallet if transaction failed
 */
async function refundWallet(reference) {
  const transaction = await prisma.transaction.findFirst({
    where: {
      reference,
    },
  });

  if (!transaction) return;

  if (transaction.status !== "FAILED") return;

  const wallet = await prisma.wallet.findUnique({
    where: {
      userId: transaction.userId,
    },
  });

  if (!wallet) return;

  const newBalance = Number(wallet.balance) + Number(transaction.amount);

  await prisma.wallet.update({
    where: {
      userId: transaction.userId,
    },
    data: {
      balance: newBalance,
    },
  });

  await prisma.walletLedger.create({
    data: {
      userId: transaction.userId,
      reference: `${reference}-REFUND`,
      type: "CREDIT",
      amount: transaction.amount,
      balanceBefore: wallet.balance,
      balanceAfter: newBalance,
      module: "AUTO_REFUND",
      description: `Automatic refund for failed transaction ${reference}`,
    },
  });

  emitEvent("wallet-updated", {
    userId: transaction.userId,
    balance: newBalance,
  });

  return newBalance;
}

module.exports = {
  updateCommand,
  updateTransaction,
  refundWallet,
};