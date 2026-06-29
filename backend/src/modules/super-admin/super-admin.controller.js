const superAdminService = require("./super-admin.service");

exports.dashboard = async (req, res) => {
  try {
    const stats = await superAdminService.getDashboardStats();
    const activity = await superAdminService.getRecentActivity();

    return res.json({
      success: true,
      stats,
      requests: [
        {
          title: "Pending Funding",
          desc: `${stats.pendingFunding} funding requests waiting for approval`,
          status: "Pending",
        },
        {
          title: "Pending Refunds",
          desc: `${stats.pendingRefunds} refund requests waiting for approval`,
          status: "Pending",
        },
        {
          title: "Low SIM Balance",
          desc: `${stats.lowSimBalance} GSM SIMs are below ₦1,000`,
          status: stats.lowSimBalance > 0 ? "Alert" : "OK",
        },
      ],
      activities: [
        ...activity.transactions.map((item) => ({
          text: `${item.user?.name || "User"} made ${item.type} transaction ₦${Number(item.amount).toLocaleString()}`,
          time: item.createdAt,
        })),
        ...activity.users.map((item) => ({
          text: `${item.name} registered as ${item.role}`,
          time: item.createdAt,
        })),
        ...activity.tickets.map((item) => ({
          text: `${item.user?.name || "User"} opened support ticket: ${item.subject}`,
          time: item.createdAt,
        })),
      ]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.recentActivity = async (req, res) => {
  try {
    const activity = await superAdminService.getRecentActivity();

    return res.json({
      success: true,
      activity,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.financialSummary = async (req, res) => {
  try {
    const summary = await superAdminService.getFinancialSummary();

    return res.json({
      success: true,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.systemHealth = async (req, res) => {
  try {
    const health = await superAdminService.getSystemHealth();

    return res.json({
      success: true,
      health,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};