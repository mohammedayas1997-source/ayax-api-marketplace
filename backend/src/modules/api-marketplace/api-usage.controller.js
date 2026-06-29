const usageService = require("./api-usage.service");

exports.getUsageLogs = async (req, res) => {
  try {
    const result = await usageService.getUsageLogs(req.query);

    return res.json({
      success: true,
      usages: result.usages,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUsage = async (req, res) => {
  try {
    const usage = await usageService.getUsageById(req.params.id);

    if (!usage) {
      return res.status(404).json({
        success: false,
        message: "API usage log not found",
      });
    }

    return res.json({
      success: true,
      usage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.statistics = async (req, res) => {
  try {
    const stats = await usageService.statistics();

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};