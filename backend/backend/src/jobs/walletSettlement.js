const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

exports.runWalletSettlement = async () => {
  const pendingFundings = await prisma.walletFunding.findMany({
    where: {
      status: "PENDING",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const pendingWithdrawals = await prisma.walletWithdrawal.findMany({
    where: {
      status: "PENDING",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  emitEvent("wallet-settlement-summary", {
    pendingFundings: pendingFundings.length,
    pendingWithdrawals: pendingWithdrawals.length,
  });

  return {
    pendingFundings: pendingFundings.length,
    pendingWithdrawals: pendingWithdrawals.length,
  };
};