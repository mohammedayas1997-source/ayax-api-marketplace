const keyService = require("./api-key.service");
const createAuditLog = require("../../utils/audit");
const { emitEvent } = require("../../config/socket");

const SUPER_ADMIN_PIN = process.env.SUPER_ADMIN_PIN || "123456";

const checkPin = (pin) => String(pin) === String(SUPER_ADMIN_PIN);

exports.getKeys = async (req, res) => {
  try {
    const keys = await keyService.getKeys(req.query);

    return res.json({
      success: true,
      keys,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getKey = async (req, res) => {
  try {
    const key = await keyService.getKey(req.params.id);

    if (!key) {
      return res.status(404).json({
        success: false,
        message: "API key not found",
      });
    }

    return res.json({
      success: true,
      key,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createKey = async (req, res) => {
  try {
    const key = await keyService.createKey(req.body);

    await createAuditLog({
      user: req.user,
      action: "CREATE_API_KEY",
      module: "API_KEY",
      description: `${req.user.email} created API key for user ${key.user?.email}`,
      ip: req.ip,
    });

    emitEvent("api-key-created", {
      message: "API key created",
      key,
    });

    return res.status(201).json({
      success: true,
      message: "API key created successfully",
      key,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.regenerateKey = async (req, res) => {
  try {
    if (!checkPin(req.body.pin)) {
      return res.status(403).json({
        success: false,
        message: "Invalid Super Admin PIN",
      });
    }

    const key = await keyService.regenerateKey(req.params.id);

    await createAuditLog({
      user: req.user,
      action: "REGENERATE_API_KEY",
      module: "API_KEY",
      description: `${req.user.email} regenerated API key ${key.name}`,
      ip: req.ip,
    });

    emitEvent("api-key-regenerated", {
      message: "API key regenerated",
      key,
    });

    return res.json({
      success: true,
      message: "API key regenerated successfully",
      key,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.changeStatus = async (req, res) => {
  try {
    const key = await keyService.changeStatus(req.params.id, req.body.status);

    await createAuditLog({
      user: req.user,
      action: "CHANGE_API_KEY_STATUS",
      module: "API_KEY",
      description: `${req.user.email} changed API key status to ${key.status}`,
      ip: req.ip,
    });

    emitEvent("api-key-status-changed", {
      message: "API key status changed",
      key,
    });

    return res.json({
      success: true,
      message: "API key status updated successfully",
      key,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteKey = async (req, res) => {
  try {
    const key = await keyService.deleteKey(req.params.id);

    await createAuditLog({
      user: req.user,
      action: "DELETE_API_KEY",
      module: "API_KEY",
      description: `${req.user.email} deleted API key ${key.name}`,
      ip: req.ip,
    });

    emitEvent("api-key-deleted", {
      message: "API key deleted",
      keyId: req.params.id,
    });

    return res.json({
      success: true,
      message: "API key deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.statistics = async (req, res) => {
  try {
    const stats = await keyService.statistics();

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