const webhookService = require("./webhook.service");
const createAuditLog = require("../../utils/audit");

exports.getWebhooks = async (req, res) => {
  try {
    const result =
      await webhookService.getWebhooks(req.query);

    res.json({
      success: true,
      webhooks: result.webhooks,
      pagination: result.pagination,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

exports.getWebhook = async (req, res) => {
  try {
    const webhook =
      await webhookService.getWebhook(req.params.id);

    res.json({
      success: true,
      webhook,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

exports.createWebhook = async (req, res) => {
  try {
    const webhook =
      await webhookService.createWebhook(req.body);

    await createAuditLog({
      user: req.user,
      action: "CREATE_WEBHOOK",
      module: "WEBHOOK",
      description: `Webhook created`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      webhook,
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: e.message,
    });
  }
};

exports.updateWebhook = async (req, res) => {
  try {
    const webhook =
      await webhookService.updateWebhook(
        req.params.id,
        req.body
      );

    res.json({
      success: true,
      webhook,
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: e.message,
    });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    await webhookService.deleteWebhook(
      req.params.id
    );

    res.json({
      success: true,
      message: "Webhook deleted successfully",
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: e.message,
    });
  }
};

exports.statistics = async (req, res) => {
  try {
    const stats =
      await webhookService.statistics();

    res.json({
      success: true,
      stats,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};