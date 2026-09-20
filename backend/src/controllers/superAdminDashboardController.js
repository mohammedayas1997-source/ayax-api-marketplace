const prisma = require("../config/prisma");
// const gatewayService = require("../services/gatewayService");

exports.getSuperAdminDashboard = async (req, res) => {
  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    let liveGatewayData = { dataBalance: "0 MB", airtimeBalance: 0 };
    try {
      if (typeof gatewayService !== "undefined" && gatewayService.fetchLiveBalancesFromGateway) {
        liveGatewayData = await gatewayService.fetchLiveBalancesFromGateway();
      }
    } catch (err) {
      console.error("Gagara dauko bayani daga Gateway kai tsaye:", err.message);
    }

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

        availableAirtimeBalance: liveGatewayData.airtimeBalance || 0,
        availableDataBalance: liveGatewayData.dataBalance || "0 MB",

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

/* =========================================================================
   ADMIN DATA PLANS & NETWORK PRICE MANAGEMENT CONTROLLERS
========================================================================= */

/**
 * @desc    Get all data plans across all networks for Admin Panel
 * @route   GET /api/v1/admin/plans
 * @access  Private (Admin / SuperAdmin)
 */
exports.getAllAdminPlans = async (req, res) => {
  try {
    const { network, networkId } = req.query;

    const whereClause = {};
    if (network) whereClause.network = String(network).toUpperCase().trim();
    if (networkId) whereClause.networkId = String(networkId).trim();

    const plans = await prisma.dataPlan.findMany({
      where: whereClause,
      orderBy: [
        { networkId: "asc" },
        { planId: "asc" },
      ],
    });

    const networks = [
      { id: "1", name: "MTN" },
      { id: "2", name: "AIRTEL" },
      { id: "3", name: "9MOBILE" },
      { id: "4", name: "GLO" },
    ];

    return res.status(200).json({
      success: true,
      status: "success",
      count: plans.length,
      data: {
        networks,
        plans,
      },
    });
  } catch (error) {
    console.error("Admin Get Plans Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch data plans: " + error.message,
    });
  }
};

/**
 * @desc    Create a new Data Plan with Network ID, Price, and USSD/Gateway routing
 * @route   POST /api/v1/admin/plans/create
 * @access  Private (Admin / SuperAdmin)
 */
exports.createAdminPlan = async (req, res) => {
  try {
    const {
      networkId,
      network,
      planId,
      name,
      volume,
      type,
      validity,
      apiPrice,
      ussdCode,
      gatewayPlanId,
      isActive,
    } = req.body;

    if (!networkId || !planId || !name || !volume || apiPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: networkId, planId, name, volume, and apiPrice are required.",
      });
    }

    const networkMap = {
      "1": "MTN",
      "2": "AIRTEL",
      "3": "9MOBILE",
      "4": "GLO",
    };

    const cleanNetworkId = String(networkId).trim();
    const resolvedNetwork = String(network || networkMap[cleanNetworkId] || "MTN").toUpperCase().trim();

    const existingPlan = await prisma.dataPlan.findUnique({
      where: { planId: String(planId).trim() },
    });

    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: `Plan ID '${planId}' already exists in the system. Use a unique identifier.`,
      });
    }

    const newPlan = await prisma.dataPlan.create({
      data: {
        networkId: cleanNetworkId,
        network: resolvedNetwork,
        planId: String(planId).trim(),
        name: String(name).trim(),
        volume: String(volume).trim(),
        type: type ? String(type).toUpperCase().trim() : "SME",
        validity: validity ? String(validity).trim() : "30 Days",
        apiPrice: parseFloat(apiPrice),
        ussdCode: ussdCode ? String(ussdCode).trim() : null,
        gatewayPlanId: gatewayPlanId ? String(gatewayPlanId).trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return res.status(201).json({
      success: true,
      status: "success",
      message: `Plan '${newPlan.name}' created successfully!`,
      data: newPlan,
    });
  } catch (error) {
    console.error("Admin Create Plan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create plan: " + error.message,
    });
  }
};

/**
 * @desc    Update Plan Price, Name, Volume or Routing Codes
 * @route   PUT /api/v1/admin/plans/update/:planId
 * @access  Private (Admin / SuperAdmin)
 */
exports.updateAdminPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const {
      name,
      volume,
      type,
      validity,
      apiPrice,
      ussdCode,
      gatewayPlanId,
      isActive,
      networkId,
      network,
    } = req.body;

    const existingPlan = await prisma.dataPlan.findUnique({
      where: { planId: String(planId).trim() },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: `Plan with ID '${planId}' not found.`,
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (volume !== undefined) updateData.volume = String(volume).trim();
    if (type !== undefined) updateData.type = String(type).toUpperCase().trim();
    if (validity !== undefined) updateData.validity = String(validity).trim();
    if (apiPrice !== undefined) updateData.apiPrice = parseFloat(apiPrice);
    if (ussdCode !== undefined) updateData.ussdCode = ussdCode ? String(ussdCode).trim() : null;
    if (gatewayPlanId !== undefined) updateData.gatewayPlanId = gatewayPlanId ? String(gatewayPlanId).trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (networkId !== undefined) updateData.networkId = String(networkId).trim();
    if (network !== undefined) updateData.network = String(network).toUpperCase().trim();

    const updatedPlan = await prisma.dataPlan.update({
      where: { planId: String(planId).trim() },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      status: "success",
      message: `Plan '${updatedPlan.name}' updated successfully!`,
      data: updatedPlan,
    });
  } catch (error) {
    console.error("Admin Update Plan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update plan: " + error.message,
    });
  }
};

/**
 * @desc    Toggle Plan Status (Activate / Deactivate)
 * @route   PATCH /api/v1/admin/plans/toggle-status/:planId
 * @access  Private (Admin / SuperAdmin)
 */
exports.togglePlanStatus = async (req, res) => {
  try {
    const { planId } = req.params;

    const existingPlan = await prisma.dataPlan.findUnique({
      where: { planId: String(planId).trim() },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: `Plan with ID '${planId}' not found.`,
      });
    }

    const updatedPlan = await prisma.dataPlan.update({
      where: { planId: String(planId).trim() },
      data: { isActive: !existingPlan.isActive },
    });

    return res.status(200).json({
      success: true,
      status: "success",
      message: `Plan '${updatedPlan.name}' is now ${updatedPlan.isActive ? "ACTIVE" : "INACTIVE"}.`,
      data: updatedPlan,
    });
  } catch (error) {
    console.error("Admin Toggle Plan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle plan status: " + error.message,
    });
  }
};

/**
 * @desc    Delete Data Plan
 * @route   DELETE /api/v1/admin/plans/delete/:planId
 * @access  Private (Admin / SuperAdmin)
 */
exports.deleteAdminPlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const existingPlan = await prisma.dataPlan.findUnique({
      where: { planId: String(planId).trim() },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: `Plan with ID '${planId}' not found.`,
      });
    }

    await prisma.dataPlan.delete({
      where: { planId: String(planId).trim() },
    });

    return res.status(200).json({
      success: true,
      status: "success",
      message: `Plan '${existingPlan.name}' (ID: ${planId}) was deleted successfully.`,
    });
  } catch (error) {
    console.error("Admin Delete Plan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete plan: " + error.message,
    });
  }
};