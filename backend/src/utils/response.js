/**
 * ==========================================
 * AYAX API MARKETPLACE
 * Standard API Response Utility
 * ==========================================
 */

class ApiResponse {
  static success(
    res,
    data = null,
    message = "Success",
    statusCode = 200
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  static created(
    res,
    data = null,
    message = "Created successfully"
  ) {
    return res.status(201).json({
      success: true,
      message,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  static error(
    res,
    message = "Something went wrong",
    statusCode = 500,
    errors = null
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  static validation(
    res,
    errors
  ) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  static unauthorized(
    res,
    message = "Unauthorized"
  ) {
    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  static forbidden(
    res,
    message = "Forbidden"
  ) {
    return res.status(403).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  static notFound(
    res,
    message = "Resource not found"
  ) {
    return res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  static paginated(
    res,
    data,
    pagination
  ) {
    return res.status(200).json({
      success: true,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = ApiResponse;