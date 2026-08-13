const serviceService = require("./api-service.service");
const createAuditLog = require("../../utils/audit");
const { emitEvent } = require("../../config/socket");

// ==========================================
// Get All Services
// ==========================================
exports.getServices = async (req, res) => {
  try {
    const result = await serviceService.getServices(req.query);

    res.json({
      success: true,
      services: result.services,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Get Single Service
// ==========================================
exports.getService = async (req, res) => {
  try {
    const service = await serviceService.getServiceById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.json({
      success: true,
      service,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Create Service
// ==========================================
exports.createService = async (req, res) => {
  try {
    const service = await serviceService.createService(req.body);

    await createAuditLog({
      user: req.user,
      action: "CREATE_API_SERVICE",
      module: "API_SERVICE",
      description: `${req.user.email} created API service ${service.name}`,
      ip: req.ip,
    });

    emitEvent("api-service-created", service);

    res.status(201).json({
      success: true,
      message: "API service created successfully",
      service,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Update Service
// ==========================================
exports.updateService = async (req, res) => {
  try {
    const service = await serviceService.updateService(
      req.params.id,
      req.body
    );

    await createAuditLog({
      user: req.user,
      action: "UPDATE_API_SERVICE",
      module: "API_SERVICE",
      description: `${req.user.email} updated API service ${service.name}`,
      ip: req.ip,
    });

    emitEvent("api-service-updated", service);

    res.json({
      success: true,
      message: "API service updated successfully",
      service,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Delete Service
// ==========================================
exports.deleteService = async (req, res) => {
  try {
    const service = await serviceService.deleteService(req.params.id);

    await createAuditLog({
      user: req.user,
      action: "DELETE_API_SERVICE",
      module: "API_SERVICE",
      description: `${req.user.email} deleted API service ${service.name}`,
      ip: req.ip,
    });

    emitEvent("api-service-deleted", {
      id: req.params.id,
    });

    res.json({
      success: true,
      message: "API service deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Change Status
// ==========================================
exports.changeStatus = async (req, res) => {
  try {
    const service = await serviceService.changeStatus(
      req.params.id,
      req.body.status
    );

    await createAuditLog({
      user: req.user,
      action: "CHANGE_API_SERVICE_STATUS",
      module: "API_SERVICE",
      description: `${req.user.email} changed status of ${service.name}`,
      ip: req.ip,
    });

    emitEvent("api-service-status", service);

    res.json({
      success: true,
      message: "Status updated successfully",
      service,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Statistics
// ==========================================
exports.statistics = async (req, res) => {
  try {
    const stats = await serviceService.statistics();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};