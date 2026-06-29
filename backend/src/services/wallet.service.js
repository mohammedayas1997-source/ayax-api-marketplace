const prisma = require("../config/prisma");
const generateReference = require("../helpers/generateReference");

exports.getOrCreateWallet = async (userId) => {
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
      },
    });
  }

  return wallet;
};

exports.debitWallet = async ({
  userId,
  amount,
  reference,
  description = "API wallet debit",
  module = "API_USAGE",
}) => {
  const wallet = await exports.getOrCreateWallet(userId);

  if (wallet.balance < Number(amount)) {
    throw new Error("Insufficient wallet balance");
  }

  const balanceBefore = wallet.balance;
  const balanceAfter = balanceBefore - Number(amount);

  return prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: {
        balance: balanceAfter,
      },
    });

    const ledger = await tx.walletLedger.create({
      data: {
        userId,
        reference: reference || generateReference("DEBIT"),
        type: "DEBIT",
        amount: Number(amount),
        balanceBefore,
        balanceAfter,
        description,
        module,
      },
    });

    return {
      wallet: updatedWallet,
      ledger,
    };
  });
};

exports.creditWallet = async ({
  userId,
  amount,
  reference,
  description = "Wallet credit",
  module = "WALLET",
}) => {
  const wallet = await exports.getOrCreateWallet(userId);

  const balanceBefore = wallet.balance;
  const balanceAfter = balanceBefore + Number(amount);

  return prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: {
        balance: balanceAfter,
      },
    });

    const ledger = await tx.walletLedger.create({
      data: {
        userId,
        reference: reference || generateReference("CREDIT"),
        type: "CREDIT",
        amount: Number(amount),
        balanceBefore,
        balanceAfter,
        description,
        module,
      },
    });

    return {
      wallet: updatedWallet,
      ledger,
    };
  });
};