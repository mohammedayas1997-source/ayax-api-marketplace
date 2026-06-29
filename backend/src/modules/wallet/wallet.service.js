const prisma = require("../../config/prisma");
const crypto = require("crypto");

const SUPER_ADMIN_PIN = process.env.SUPER_ADMIN_PIN || "123456";

const generateReference = (prefix = "AYAX") => {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

const verifyPin = (pin) => {
  return String(pin) === String(SUPER_ADMIN_PIN);
};

const getOrCreateWallet = async (userId) => {
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

exports.getMyWallet = async (userId) => {
  const wallet = await getOrCreateWallet(userId);

  const ledger = await prisma.walletLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    wallet,
    ledger,
  };
};

exports.getWalletByUserId = async (userId) => {
  const wallet = await getOrCreateWallet(userId);

  return prisma.wallet.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        },
      },
    },
  });
};

exports.createFundingRequest = async (userId, data) => {
  await getOrCreateWallet(userId);

  return prisma.walletFunding.create({
    data: {
      userId,
      amount: Number(data.amount),
      reference: generateReference("FUND"),
      channel: data.channel || "MANUAL",
      proofUrl: data.proofUrl || null,
      note: data.note || null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });
};

exports.getFundingRequests = async ({ status, search }) => {
  return prisma.walletFunding.findMany({
    where: {
      AND: [
        status && status !== "ALL" ? { status } : {},
        search
          ? {
              OR: [
                { reference: { contains: search, mode: "insensitive" } },
                { channel: { contains: search, mode: "insensitive" } },
                {
                  user: {
                    OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                      { phone: { contains: search, mode: "insensitive" } },
                    ],
                  },
                },
              ],
            }
          : {},
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

exports.approveFunding = async ({ fundingId, adminUser, pin, note }) => {
  if (!verifyPin(pin)) {
    throw new Error("Invalid Super Admin PIN");
  }

  const funding = await prisma.walletFunding.findUnique({
    where: { id: fundingId },
  });

  if (!funding) {
    throw new Error("Funding request not found");
  }

  if (funding.status !== "PENDING") {
    throw new Error("Funding request has already been processed");
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { userId: funding.userId },
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + funding.amount;

    const updatedWallet = await tx.wallet.update({
      where: { userId: funding.userId },
      data: {
        balance: balanceAfter,
      },
    });

    const updatedFunding = await tx.walletFunding.update({
      where: { id: fundingId },
      data: {
        status: "APPROVED",
        approvedBy: adminUser?.id || null,
        approvedAt: new Date(),
        note: note || funding.note,
      },
    });

    const ledger = await tx.walletLedger.create({
      data: {
        userId: funding.userId,
        reference: funding.reference,
        type: "CREDIT",
        amount: funding.amount,
        balanceBefore,
        balanceAfter,
        description: "Wallet funding approved",
        module: "WALLET_FUNDING",
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        reference: funding.reference,
        userId: funding.userId,
        type: "CREDIT",
        service: "Wallet Funding",
        amount: funding.amount,
        status: "SUCCESSFUL",
        description: "Wallet funding approved",
      },
    });

    return {
      wallet: updatedWallet,
      funding: updatedFunding,
      ledger,
      transaction,
    };
  });
};

exports.rejectFunding = async ({ fundingId, adminUser, note }) => {
  const funding = await prisma.walletFunding.findUnique({
    where: { id: fundingId },
  });

  if (!funding) {
    throw new Error("Funding request not found");
  }

  if (funding.status !== "PENDING") {
    throw new Error("Funding request has already been processed");
  }

  return prisma.walletFunding.update({
    where: { id: fundingId },
    data: {
      status: "REJECTED",
      rejectedBy: adminUser?.id || null,
      rejectedAt: new Date(),
      note,
    },
  });
};

exports.createWithdrawalRequest = async (userId, data) => {
  const wallet = await getOrCreateWallet(userId);

  if (wallet.balance < Number(data.amount)) {
    throw new Error("Insufficient wallet balance");
  }

  return prisma.walletWithdrawal.create({
    data: {
      userId,
      amount: Number(data.amount),
      reference: generateReference("WITHDRAW"),
      bankName: data.bankName,
      accountName: data.accountName,
      accountNumber: data.accountNumber,
      note: data.note || null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });
};

exports.getWithdrawalRequests = async ({ status, search }) => {
  return prisma.walletWithdrawal.findMany({
    where: {
      AND: [
        status && status !== "ALL" ? { status } : {},
        search
          ? {
              OR: [
                { reference: { contains: search, mode: "insensitive" } },
                { bankName: { contains: search, mode: "insensitive" } },
                { accountName: { contains: search, mode: "insensitive" } },
                { accountNumber: { contains: search, mode: "insensitive" } },
                {
                  user: {
                    OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                      { phone: { contains: search, mode: "insensitive" } },
                    ],
                  },
                },
              ],
            }
          : {},
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

exports.approveWithdrawal = async ({ withdrawalId, adminUser, pin, note }) => {
  if (!verifyPin(pin)) {
    throw new Error("Invalid Super Admin PIN");
  }

  const withdrawal = await prisma.walletWithdrawal.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) {
    throw new Error("Withdrawal request not found");
  }

  if (withdrawal.status !== "PENDING") {
    throw new Error("Withdrawal request has already been processed");
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { userId: withdrawal.userId },
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.balance < withdrawal.amount) {
      throw new Error("Insufficient wallet balance");
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - withdrawal.amount;

    const updatedWallet = await tx.wallet.update({
      where: { userId: withdrawal.userId },
      data: {
        balance: balanceAfter,
      },
    });

    const updatedWithdrawal = await tx.walletWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: "APPROVED",
        approvedBy: adminUser?.id || null,
        approvedAt: new Date(),
        note: note || withdrawal.note,
      },
    });

    const ledger = await tx.walletLedger.create({
      data: {
        userId: withdrawal.userId,
        reference: withdrawal.reference,
        type: "DEBIT",
        amount: withdrawal.amount,
        balanceBefore,
        balanceAfter,
        description: "Wallet withdrawal approved",
        module: "WALLET_WITHDRAWAL",
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        reference: withdrawal.reference,
        userId: withdrawal.userId,
        type: "DEBIT",
        service: "Wallet Withdrawal",
        amount: withdrawal.amount,
        status: "SUCCESSFUL",
        description: "Wallet withdrawal approved",
      },
    });

    return {
      wallet: updatedWallet,
      withdrawal: updatedWithdrawal,
      ledger,
      transaction,
    };
  });
};

exports.rejectWithdrawal = async ({ withdrawalId, adminUser, note }) => {
  const withdrawal = await prisma.walletWithdrawal.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) {
    throw new Error("Withdrawal request not found");
  }

  if (withdrawal.status !== "PENDING") {
    throw new Error("Withdrawal request has already been processed");
  }

  return prisma.walletWithdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: "REJECTED",
      rejectedBy: adminUser?.id || null,
      rejectedAt: new Date(),
      note,
    },
  });
};

exports.manualAdjustment = async ({ userId, type, amount, pin, description }) => {
  if (!verifyPin(pin)) {
    throw new Error("Invalid Super Admin PIN");
  }

  const wallet = await getOrCreateWallet(userId);
  const reference = generateReference("ADJUST");

  const balanceBefore = wallet.balance;
  const balanceAfter =
    type === "CREDIT"
      ? balanceBefore + Number(amount)
      : balanceBefore - Number(amount);

  if (balanceAfter < 0) {
    throw new Error("Insufficient wallet balance for debit adjustment");
  }

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
        reference,
        type: type === "CREDIT" ? "CREDIT" : "DEBIT",
        amount: Number(amount),
        balanceBefore,
        balanceAfter,
        description,
        module: "MANUAL_ADJUSTMENT",
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        reference,
        userId,
        type: type === "CREDIT" ? "CREDIT" : "DEBIT",
        service: "Manual Wallet Adjustment",
        amount: Number(amount),
        status: "SUCCESSFUL",
        description,
      },
    });

    return {
      wallet: updatedWallet,
      ledger,
      transaction,
    };
  });
};

exports.getLedger = async ({ userId, type }) => {
  return prisma.walletLedger.findMany({
    where: {
      AND: [
        userId ? { userId } : {},
        type && type !== "ALL" ? { type } : {},
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

exports.statistics = async () => {
  const [totalWallets, totalFunding, pendingFunding, pendingWithdrawals] =
    await Promise.all([
      prisma.wallet.count(),

      prisma.walletFunding.aggregate({
        where: {
          status: "APPROVED",
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.walletFunding.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.walletWithdrawal.count({
        where: {
          status: "PENDING",
        },
      }),
    ]);

  return {
    totalWallets,
    totalApprovedFunding: totalFunding._sum.amount || 0,
    pendingFunding,
    pendingWithdrawals,
  };
};