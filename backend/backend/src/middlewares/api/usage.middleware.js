const prisma = require("../../config/prisma");

module.exports = async (req, res, next) => {
  const startedAt = Date.now();

  const originalJson = res.json;

  res.json = async function (body) {
    try {
      const latency = Date.now() - startedAt;

      if (req.developer && req.apiKey) {
        await prisma.apiUsage.create({
          data: {
            userId: req.developer.id,
            apiKeyId: req.apiKey.id,

            endpoint: req.originalUrl,

            method: req.method,

            amount: Number(req.apiCost || 0),

            status:
              body?.success === true
                ? "SUCCESSFUL"
                : "FAILED",

            requestBody: JSON.stringify(req.body || {}),

            responseBody: JSON.stringify(body || {}),

            ipAddress:
              req.ip ||
              req.headers["x-forwarded-for"] ||
              null,

            latency,

            userAgent:
              req.headers["user-agent"] || null,
          },
        });
      }
    } catch (err) {
      console.error(
        "Usage Middleware:",
        err.message
      );
    }

    return originalJson.call(this, body);
  };

  next();
};