const prisma = require("../../config/prisma");

exports.dashboard = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const [
      providers,
      activeProviders,
      services,
      plans,
      apiKeys,
      todayCalls,
      failedCalls,
      successfulCalls,
      monthlyRevenue,
      recentUsage,
    ] = await Promise.all([
      prisma.apiProvider.count(),
      prisma.apiProvider.count({ where: { status: "ACTIVE" } }),
      prisma.apiService.count(),
      prisma.apiPlan.count(),
      prisma.apiKey.count(),

      prisma.apiUsage.count({
        where: { createdAt: { gte: startOfToday } },
      }),

      prisma.apiUsage.count({
        where: { status: "FAILED", createdAt: { gte: startOfToday } },
      }),

      prisma.apiUsage.count({
        where: { status: "SUCCESSFUL", createdAt: { gte: startOfToday } },
      }),

      prisma.transaction.aggregate({
        where: {
          status: "SUCCESSFUL",
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),

      prisma.apiUsage.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    const totalCheckedCalls = successfulCalls + failedCalls;
    const successRate =
      totalCheckedCalls === 0
        ? "100%"
        : `${((successfulCalls / totalCheckedCalls) * 100).toFixed(1)}%`;

    return res.json({
      success: true,
      stats: {
        providers,
        activeProviders,
        services,
        plans,
        apiKeys,
        todayCalls,
        failedCalls,
        successRate,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
      },
      activities: recentUsage.map((item) => ({
        id: item.id,
        text: `${item.user?.name || "Developer"} called ${item.endpoint || "API"}`,
        status: item.status,
        amount: item.amount || 0,
        time: item.createdAt,
      })),
      system: {
        database: "CONNECTED",
        socket: "ENABLED",
        redis: process.env.REDIS_DISABLED === "true" ? "DISABLED" : "CONFIGURED",
        environment: process.env.NODE_ENV || "development",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};