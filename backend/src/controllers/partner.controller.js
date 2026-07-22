const partnerService = require(
  "../services/partner.service"
);

const {
  emitEvent,
} = require("../config/socket");

const sendError = (
  res,
  error,
  fallbackMessage
) => {
  const message =
    error?.message || fallbackMessage;

  const lowerMessage =
    message.toLowerCase();

  let statusCode = 500;

  if (
    lowerMessage.includes("required") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("already exists")
  ) {
    statusCode = 400;
  }

  if (
    lowerMessage.includes("not found")
  ) {
    statusCode = 404;
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

exports.getPartners = async (
  req,
  res
) => {
  try {
    const partners =
      await partnerService.listPartners({
        category: req.query.category,
        status: req.query.status,
        search: req.query.search,
      });

    return res.status(200).json({
      success: true,
      count: partners.length,
      partners,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to load partners"
    );
  }
};

exports.getPartner = async (
  req,
  res
) => {
  try {
    const partner =
      await partnerService.getPartnerById(
        req.params.id
      );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    return res.status(200).json({
      success: true,
      partner,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to load partner"
    );
  }
};

exports.createPartner = async (
  req,
  res
) => {
  try {
    const partner =
      await partnerService.createPartner(
        req.body
      );

    emitEvent("partner-created", {
      id: partner.id,
      name: partner.name,
      code: partner.code,
      category: partner.category,
      status: partner.status,
    });

    return res.status(201).json({
      success: true,
      message:
        "Partner created successfully",
      partner,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to create partner"
    );
  }
};

exports.updatePartner = async (
  req,
  res
) => {
  try {
    const partner =
      await partnerService.updatePartner(
        req.params.id,
        req.body
      );

    emitEvent("partner-updated", {
      id: partner.id,
      name: partner.name,
      code: partner.code,
      category: partner.category,
      status: partner.status,
    });

    return res.status(200).json({
      success: true,
      message:
        "Partner updated successfully",
      partner,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to update partner"
    );
  }
};

exports.updatePartnerStatus = async (
  req,
  res
) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const partner =
      await partnerService.updatePartnerStatus(
        req.params.id,
        status
      );

    emitEvent(
      "partner-status-updated",
      {
        id: partner.id,
        status: partner.status,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Partner status updated successfully",
      partner,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to update partner status"
    );
  }
};

exports.deletePartner = async (
  req,
  res
) => {
  try {
    await partnerService.deletePartner(
      req.params.id
    );

    emitEvent("partner-deleted", {
      id: req.params.id,
    });

    return res.status(200).json({
      success: true,
      message:
        "Partner deleted successfully",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to delete partner"
    );
  }
};