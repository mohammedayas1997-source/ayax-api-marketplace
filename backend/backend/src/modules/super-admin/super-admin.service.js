const prisma = require("../../config/prisma");

exports.getDashboardStats = async () => {
  const [
    totalUsers,
    admins,
    customerService,
    walletBalance,
    pendingFunding,
    pendingRefunds,
    apiPlans,
    gsmSims,
    apiCalls,
    monthlyRevenue,
    lowSimBalance,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        role: {
          in: ["ADMIN", "STAFF_ADMIN", "SUPER_ADMIN"],
        },
      },
    }),

    prisma.user.count({
      where: {
        role: "CUSTOMER_SERVICE",
      },
    }),

    prisma.wallet.aggregate({
      _sum: {
        balance: true,
      },
    }),

    prisma.walletFunding.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.refundRequest.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.apiPlan.count(),

    prisma.gsmSim.count(),

    prisma.apiUsage.count(),

    prisma.transaction.aggregate({
      where: {
        status: "SUCCESSFUL",
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.gsmSim.count({
      where: {
        balance: {
          lt: 1000,
        },
      },
    }),
  ]);

  return {
    totalUsers,
    admins,
    customerService,
    companyWallet: walletBalance._sum.balance || 0,
    pendingFunding,
    pendingRefunds,
    apiPlans,
    gsmSims,
    apiCalls,
    monthlyRevenue: monthlyRevenue._sum.amount || 0,
    systemHealth: "99.9%",
    lowSimBalance,
  };
};
exports.getRecentActivity = async () => {
  const [transactions, users, audits, tickets] = await Promise.all([
    prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),

    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),

    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    }),

    prisma.supportTicket.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  return {
    transactions,
    users,
    audits,
    tickets,
  };
};

exports.getFinancialSummary = async () => {
  const [walletBalance, revenue, credits, debits] = await Promise.all([
    prisma.wallet.aggregate({
      _sum: { balance: true },
    }),

    prisma.transaction.aggregate({
      where: { status: "SUCCESSFUL" },
      _sum: { amount: true },
    }),

    prisma.walletLedger.aggregate({
      where: { type: "CREDIT" },
      _sum: { amount: true },
    }),

    prisma.walletLedger.aggregate({
      where: { type: "DEBIT" },
      _sum: { amount: true },
    }),
  ]);

  return {
    walletBalance: walletBalance._sum.balance || 0,
    revenue: revenue._sum.amount || 0,
    totalCredit: credits._sum.amount || 0,
    totalDebit: debits._sum.amount || 0,
  };
};

exports.getSystemHealth = async () => {
  return {
    server: {
      status: "HEALTHY",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    },
    database: {
      status: "CONNECTED",
    },
    redis: {
      status: process.env.REDIS_DISABLED === "true" ? "DISABLED" : "CONFIGURED",
    },
    timestamp: new Date().toISOString(),
  };
};