const keyService = require("../modules/api-marketplace/api-key.service");
const usageService = require("../modules/api-marketplace/api-usage.service");

/* ======================================================
   API KEY AUTHENTICATION MIDDLEWARE
====================================================== */

module.exports = (requiredScope = null) => {
  return async (req, res, next) => {
    const startedAt = Date.now();

    try {
      const apiKey = String(
        req.headers["x-api-key"] || ""
      ).trim();

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message: "API key is required.",
        });
      }

      /*
       * Verify API Key
       */
      const key = await keyService.verifyApiKey(apiKey);

      if (!key) {
        return res.status(401).json({
          success: false,
          message: "Invalid, expired or revoked API key.",
        });
      }

      /*
       * Scope Check
       */
      if (
        requiredScope &&
        !keyService.hasScope(key, requiredScope)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This API key is not permitted to access this endpoint.",
        });
      }

      /*
       * Rate Limit Check
       */
      const rate =
        await usageService.checkApiKeyRateLimit(key);

      res.setHeader(
        "X-RateLimit-Limit-Minute",
        rate.minute.limit
      );

      res.setHeader(
        "X-RateLimit-Remaining-Minute",
        rate.minute.remaining
      );

      res.setHeader(
        "X-RateLimit-Limit-Day",
        rate.day.limit
      );

      res.setHeader(
        "X-RateLimit-Remaining-Day",
        rate.day.remaining
      );

      /*
       * Update Last Used
       */
      await keyService.updateLastUsed(key.id);

      /*
       * Create Usage Log
       */
      const usage =
        await usageService.createUsageLog({
          userId: key.user.id,
          apiKeyId: key.id,

          endpoint: req.originalUrl,

          method: req.method,

          service: requiredScope,

          status: "PROCESSING",

          ipAddress:
            req.ip ||
            req.headers["x-forwarded-for"],

          userAgent:
            req.headers["user-agent"],

          requestBody: req.body,
        });

      /*
       * Attach Request Objects
       */
      req.apiKey = key;
      req.apiUser = key.user;
      req.user = key.user;

      req.apiUsageLogId = usage.id;
      req.requestStartedAt = startedAt;

      return next();
    } catch (error) {
      console.error(
        "API Key Middleware:",
        error
      );

      const status =
        error.statusCode || 500;

      return res.status(status).json({
        success: false,
        code: error.code || "API_KEY_ERROR",
        message:
          error.message ||
          "Unable to authenticate API key.",
      });
    }
  };
};