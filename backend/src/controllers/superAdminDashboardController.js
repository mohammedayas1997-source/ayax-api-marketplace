const prisma = require("../config/prisma");

exports.getSuperAdminDashboard = async (req, res) => {
  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const [
      totalUsers,
      admins,
      customerService,
      companyWallet,
      pendingFunding,
      pendingRefunds,
      apiPlans,
      gsmSims,
      apiCalls,
      monthlyRevenue,
      lowSimBalance,
      totalSimAirtime, // An ƙara jimillar Airtime a SIMs
      totalSimData,    // An ƙara jimillar Data a SIMs (idan an adana su a matsayin lamba ko za mu yi summing)
      fundingRequests,
      refundRequests,
      activities,
      serverHealth,
      redisMonitor,
      onlineGatewayDevices,
      totalGatewayDevices,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.user.count({
        where: {
          role: {
            in: ["SUPER_ADMIN", "ADMIN", "STAFF_ADMIN"],
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

      prisma.fundingRequest.count({
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
          type: "CREDIT",
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.gsmSim.count({
        where: {
          airtimeBalance: {
            lt: 1000,
          },
        },
      }),

      // 1. Jimillar Airtime Balance a dukkan SIMs
      prisma.gsmSim.aggregate({
        _sum: {
          airtimeBalance: true,
        },
      }),

      // 2. Jimillar Data Balance a dukkan SIMs (Idan sunan filin dataBalance ne a DB ɗinka)
      prisma.gsmSim.aggregate({
        _sum: {
          dataBalance: true, // Idan a string yake a DB, za mu iya sarrafa shi a kasa
        },
      }),

      prisma.fundingRequest.findMany({
        where: {
          status: "PENDING",
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),

      prisma.refundRequest.findMany({
        where: {
          status: "PENDING",
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),

      prisma.activityLog.findMany({
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),

      prisma.serverHealth.findFirst({
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.redisMonitor.findFirst({
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.gatewayDevice.count({
        where: {
          status: "ONLINE",
        },
      }),

      prisma.gatewayDevice.count(),
    ]);

    const requests = [
      ...fundingRequests.map((item) => ({
        id: item.id,
        title: "Funding Request",
        desc: `${item.user?.name} requested ₦${item.amount.toLocaleString()}`,
        status: item.status,
        createdAt: item.createdAt,
      })),

      ...refundRequests.map((item) => ({
        id: item.id,
        title: "Refund Request",
        desc: `${item.user?.name} requested ₦${item.amount.toLocaleString()} refund`,
        status: item.status,
        createdAt: item.createdAt,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    const activityFeed = activities.map((item) => ({
      id: item.id,
      type: item.type,
      text:
        item.description ||
        `${item.user?.name} performed ${item.type}`,
      time: item.createdAt,
    }));

    return res.json({
      success: true,

      stats: {
        totalUsers,
        admins,
        customerService,

        companyWallet:
          companyWallet._sum.balance || 0,

        // Sabbin bayanan balance da aka kawo:
        availableAirtimeBalance:
          totalSimAirtime._sum.airtimeBalance || 0,

        availableDataBalance:
          totalSimData._sum.dataBalance 
            ? `${totalSimData._sum.dataBalance} MB` 
            : "0 MB", // Zaka iya canza 'MB' zuwa 'GB' ko barinsa yadda kake so

        pendingFunding,
        pendingRefunds,

        apiPlans,
        gsmSims,
        apiCalls,

        monthlyRevenue:
          monthlyRevenue._sum.amount || 0,

        systemHealth:
          serverHealth?.status || "HEALTHY",

        lowSimBalance,
      },

      system: {
        api: "Online",
        database: "Connected",
        socket: "Connected",
        gateway:
          onlineGatewayDevices > 0
            ? "Online"
            : "Offline",
        serverHealth,
        redis: redisMonitor,
        onlineGatewayDevices,
        totalGatewayDevices,
      },

      requests,
      activities: activityFeed,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};