const providerService = require("./api-provider.service");
const createAuditLog = require("../../utils/audit");
const { emitEvent } = require("../../config/socket");

// ===============================
// Get Providers
// ===============================
exports.getProviders = async (req, res) => {
  try {
    const result = await providerService.getProviders(req.query);

    return res.json({
      success: true,
      providers: result.providers,
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
// Get Provider
// ===============================
exports.getProvider = async (req, res) => {
  try {
    const provider = await providerService.getProviderById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    return res.json({
      success: true,
      provider,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Create Provider
// ===============================
exports.createProvider = async (req, res) => {
  try {
    const provider = await providerService.createProvider(req.body);

    await createAuditLog({
      user: req.user,
      action: "CREATE_API_PROVIDER",
      module: "API_MARKETPLACE",
      description: `${req.user.email} created API provider ${provider.name}`,
      ip: req.ip,
    });

    emitEvent("api-provider-created", {
      message: "API provider created",
      provider,
    });

    return res.status(201).json({
      success: true,
      message: "API provider created successfully",
      provider,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Update Provider
// ===============================
exports.updateProvider = async (req, res) => {
  try {
    const provider = await providerService.updateProvider(
      req.params.id,
      req.body
    );

    await createAuditLog({
      user: req.user,
      action: "UPDATE_API_PROVIDER",
      module: "API_MARKETPLACE",
      description: `${req.user.email} updated API provider ${provider.name}`,
      ip: req.ip,
    });

    emitEvent("api-provider-updated", {
      message: "API provider updated",
      provider,
    });

    return res.json({
      success: true,
      message: "API provider updated successfully",
      provider,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Delete Provider
// ===============================
exports.deleteProvider = async (req, res) => {
  try {
    const provider = await providerService.deleteProvider(req.params.id);

    await createAuditLog({
      user: req.user,
      action: "DELETE_API_PROVIDER",
      module: "API_MARKETPLACE",
      description: `${req.user.email} deleted API provider ${provider.name}`,
      ip: req.ip,
    });

    emitEvent("api-provider-deleted", {
      message: "API provider deleted",
      providerId: req.params.id,
    });

    return res.json({
      success: true,
      message: "API provider deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Change Provider Status
// ===============================
exports.changeStatus = async (req, res) => {
  try {
    const provider = await providerService.changeStatus(
      req.params.id,
      req.body.status
    );

    await createAuditLog({
      user: req.user,
      action: "CHANGE_API_PROVIDER_STATUS",
      module: "API_MARKETPLACE",
      description: `${req.user.email} changed ${provider.name} status to ${provider.status}`,
      ip: req.ip,
    });

    emitEvent("api-provider-status-changed", {
      message: "API provider status changed",
      provider,
    });

    return res.json({
      success: true,
      message: "Provider status updated successfully",
      provider,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Provider Statistics
// ===============================
exports.statistics = async (req, res) => {
  try {
    const stats = await providerService.statistics();

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