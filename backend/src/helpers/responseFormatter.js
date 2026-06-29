/**
 * ==========================================
 * AYAX API MARKETPLACE
 * Standard Response Formatter
 * ==========================================
 */

exports.success = (
  res,
  data = null,
  message = "Success",
  statusCode = 200,
  meta = {}
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data,
    meta,
  });
};

exports.error = (
  res,
  message = "Something went wrong",
  statusCode = 500,
  errors = null,
  code = "SERVER_ERROR"
) => {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

exports.paginated = (
  res,
  data,
  pagination,
  message = "Success"
) => {
  return res.status(200).json({
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data,
    pagination,
  });
};

exports.created = (
  res,
  data,
  message = "Created successfully"
) => {
  return res.status(201).json({
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data,
  });
};

exports.deleted = (
  res,
  message = "Deleted successfully"
) => {
  return res.status(200).json({
    success: true,
    message,
    timestamp: new Date().toISOString(),
  });
};

exports.noContent = (res) => {
  return res.status(204).send();
};

exports.unauthorized = (
  res,
  message = "Unauthorized"
) => {
  return res.status(401).json({
    success: false,
    code: "UNAUTHORIZED",
    message,
    timestamp: new Date().toISOString(),
  });
};

exports.forbidden = (
  res,
  message = "Forbidden"
) => {
  return res.status(403).json({
    success: false,
    code: "FORBIDDEN",
    message,
    timestamp: new Date().toISOString(),
  });
};

exports.notFound = (
  res,
  message = "Resource not found"
) => {
  return res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message,
    timestamp: new Date().toISOString(),
  });
};

exports.validationError = (
  res,
  errors
) => {
  return res.status(422).json({
    success: false,
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    errors,
    timestamp: new Date().toISOString(),
  });
};

exports.rateLimited = (
  res,
  retryAfter
) => {
  return res.status(429).json({
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests",
    retryAfter,
    timestamp: new Date().toISOString(),
  });
};