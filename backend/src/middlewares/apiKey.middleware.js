const keyService = require(
  "../modules/api-marketplace/api-key.service"
);

const usageService = require(
  "../modules/api-marketplace/api-usage.service"
);

/* ======================================================
   HELPERS
====================================================== */

const normalizeScope = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const getClientIp = (req) => {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (
    typeof forwarded === "string" &&
    forwarded.trim()
  ) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return req.ip || null;
};

const sendError = (
  res,
  status,
  code,
  message
) => {
  return res.status(status).json({
    success: false,
    code,
    message,
  });
};

/* ======================================================
   API KEY AUTHENTICATION MIDDLEWARE
====================================================== */

module.exports = (
  requiredScope = null
) => {
  return async (req, res, next) => {
    const startedAt = Date.now();

    let usageLogId = null;
    let usageFinalized = false;

    try {
      const plainApiKey = String(
        req.headers["x-api-key"] || ""
      ).trim();

      if (!plainApiKey) {
        return sendError(
          res,
          401,
          "API_KEY_REQUIRED",
          "API key is required."
        );
      }

      /*
       * verifyApiKey:
       * - hashes the supplied key
       * - checks ACTIVE status
       * - checks expiry
       * - checks user status
       * - updates lastUsedAt
       */
      const key =
        await keyService.verifyApiKey(
          plainApiKey
        );

      if (!key) {
        return sendError(
          res,
          401,
          "INVALID_API_KEY",
          "Invalid, expired or revoked API key."
        );
      }

      const scope =
        normalizeScope(
          requiredScope
        );

      if (
        scope &&
        !keyService.hasScope(
          key,
          scope
        )
      ) {
        return sendError(
          res,
          403,
          "API_SCOPE_DENIED",
          `This API key does not have the ${scope} permission.`
        );
      }

      /*
       * Per-minute and per-day limits.
       */
      const rate =
        await usageService.checkApiKeyRateLimit(
          key
        );

      const minuteRemaining =
        Math.max(
          Number(
            rate.minute.remaining || 0
          ) - 1,
          0
        );

      const dayRemaining =
        Math.max(
          Number(
            rate.day.remaining || 0
          ) - 1,
          0
        );

      res.setHeader(
        "X-RateLimit-Limit-Minute",
        String(rate.minute.limit)
      );

      res.setHeader(
        "X-RateLimit-Remaining-Minute",
        String(minuteRemaining)
      );

      res.setHeader(
        "X-RateLimit-Limit-Day",
        String(rate.day.limit)
      );

      res.setHeader(
        "X-RateLimit-Remaining-Day",
        String(dayRemaining)
      );

      /*
       * Create PROCESSING usage log.
       */
      const usage =
        await usageService.createUsageLog({
          userId: key.userId,
          apiKeyId: key.id,

          endpoint:
            req.originalUrl ||
            req.url,

          method: req.method,

          service:
            scope || null,

          status: "PROCESSING",

          ipAddress:
            getClientIp(req),

          userAgent:
            req.headers[
              "user-agent"
            ] || null,

          requestBody:
            req.body || null,
        });

      usageLogId = usage.id;

      /*
       * Attach authenticated data.
       */
      req.apiKey = key;
      req.apiUser = key.user;
      req.user = key.user;

      req.apiUsageLogId =
        usage.id;

      req.requestStartedAt =
        startedAt;

      /*
       * Automatically finalize log after
       * Express sends the response.
       */
      const finalizeUsageLog = () => {
        if (
          usageFinalized ||
          !usageLogId
        ) {
          return;
        }

        usageFinalized = true;

        const latency =
          Date.now() -
          startedAt;

        const successful =
          res.statusCode >= 200 &&
          res.statusCode < 400;

        usageService
          .updateUsageLog(
            usageLogId,
            {
              status:
                successful
                  ? "SUCCESSFUL"
                  : "FAILED",

              httpStatusCode:
                res.statusCode,

              errorCode:
                successful
                  ? null
                  : `HTTP_${res.statusCode}`,

              errorMessage:
                successful
                  ? null
                  : "The API request was not completed successfully.",

              latency,
            }
          )
          .catch((error) => {
            console.error(
              "Unable to finalize API usage log:",
              error.message
            );
          });
      };

      res.once(
        "finish",
        finalizeUsageLog
      );

      res.once(
        "close",
        finalizeUsageLog
      );

      return next();
    } catch (error) {
      console.error(
        "API key middleware error:",
        error
      );

      const latency =
        Date.now() -
        startedAt;

      if (
        usageLogId &&
        !usageFinalized
      ) {
        usageFinalized = true;

        usageService
          .updateUsageLog(
            usageLogId,
            {
              status: "FAILED",

              httpStatusCode:
                Number(
                  error.statusCode ||
                    error.status ||
                    500
                ),

              errorCode:
                error.code ||
                "API_KEY_ERROR",

              errorMessage:
                error.message ||
                "API key authentication failed.",

              latency,
            }
          )
          .catch((logError) => {
            console.error(
              "Unable to update failed usage log:",
              logError.message
            );
          });
      }

      const statusCode =
        Number(
          error.statusCode ||
            error.status ||
            500
        );

      return sendError(
        res,
        statusCode,
        error.code ||
          "API_KEY_ERROR",
        statusCode === 500
          ? "Unable to authenticate API key."
          : error.message
      );
    }
  };
};