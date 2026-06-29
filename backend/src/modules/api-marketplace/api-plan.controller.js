const planService = require("./api-plan.service");
const createAuditLog = require("../../utils/audit");
const { emitEvent } = require("../../config/socket");

// ===============================
// Get Plans
// ===============================
exports.getPlans = async (req, res) => {
  try {
    const result = await planService.getPlans(req.query);

    return res.json({
      success: true,
      plans: result.plans,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Single Plan
// ===============================
exports.getPlan = async (req, res) => {
  try {
    const plan = await planService.getPlanById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "API plan not found",
      });
    }

    return res.json({
      success: true,
      plan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Create Plan
// ===============================
exports.createPlan = async (req, res) => {
  try {
    const plan = await planService.createPlan(req.body);

    await createAuditLog({
      user: req.user,
      action: "CREATE_API_PLAN",
      module: "API_PLAN",
      description: `${req.user.email} created API plan ${plan.name}`,
      ip: req.ip,
    });

    emitEvent("api-plan-created", {
      message: "API plan created",
      plan,
    });

    return res.status(201).json({
      success: true,
      message: "API plan created successfully",
      plan,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Update Plan
// ===============================
exports.updatePlan = async (req, res) => {
  try {
    const plan = await planService.updatePlan(req.params.id, req.body);

    await createAuditLog({
      user: req.user,
      action: "UPDATE_API_PLAN",
      module: "API_PLAN",
      description: `${req.user.email} updated API plan ${plan.name}`,
      ip: req.ip,
    });

    emitEvent("api-plan-updated", {
      message: "API plan updated",
      plan,
    });

    return res.json({
      success: true,
      message: "API plan updated successfully",
      plan,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Delete Plan
// ===============================
exports.deletePlan = async (req, res) => {
  try {
    const plan = await planService.deletePlan(req.params.id);

    await createAuditLog({
      user: req.user,
      action: "DELETE_API_PLAN",
      module: "API_PLAN",
      description: `${req.user.email} deleted API plan ${plan.name}`,
      ip: req.ip,
    });

    emitEvent("api-plan-deleted", {
      message: "API plan deleted",
      planId: req.params.id,
    });

    return res.json({
      success: true,
      message: "API plan deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Change Status
// ===============================
exports.changeStatus = async (req, res) => {
  try {
    const plan = await planService.changeStatus(req.params.id, req.body.status);

    await createAuditLog({
      user: req.user,
      action: "CHANGE_API_PLAN_STATUS",
      module: "API_PLAN",
      description: `${req.user.email} changed API plan ${plan.id} status to ${plan.status}`,
      ip: req.ip,
    });

    emitEvent("api-plan-status-changed", {
      message: "API plan status changed",
      plan,
    });

    return res.json({
      success: true,
      message: "API plan status updated successfully",
      plan,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Statistics
// ===============================
exports.statistics = async (req, res) => {
  try {
    const stats = await planService.statistics();

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