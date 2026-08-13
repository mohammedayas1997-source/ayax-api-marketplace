const prisma = require("../../config/prisma");

module.exports = async (req, res, next) => {
  try {
    const serviceSlug =
      req.body.serviceSlug ||
      req.query.serviceSlug ||
      req.params.serviceSlug;

    if (!serviceSlug) {
      return res.status(400).json({
        success: false,
        code: "SERVICE_REQUIRED",
        message: "API service slug is required.",
      });
    }

    const service = await prisma.apiService.findUnique({
      where: { slug: serviceSlug },
      include: {
        provider: true,
        plans: true,
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        code: "SERVICE_NOT_FOUND",
        message: "API service not found.",
      });
    }

    if (service.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        code: "SERVICE_DISABLED",
        message: "This API service is not active.",
      });
    }

    if (!service.provider || service.provider.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        code: "PROVIDER_DISABLED",
        message: "API provider is not active.",
      });
    }

    req.apiService = service;
    req.apiProvider = service.provider;

    next();
  } catch (error) {
    console.error("Provider Middleware Error:", error.message);

    return res.status(500).json({
      success: false,
      code: "PROVIDER_CHECK_ERROR",
      message: "Unable to verify API provider.",
    });
  }
};