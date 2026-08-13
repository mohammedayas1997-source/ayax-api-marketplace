const prisma = require("../../config/prisma");

module.exports = async (req, res, next) => {
  try {
    const apiKey =
      req.headers["x-api-key"] ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        code: "API_KEY_REQUIRED",
        message: "API key is required.",
      });
    }

    const key = await prisma.apiKey.findUnique({
      where: {
        key: apiKey,
      },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!key) {
      return res.status(401).json({
        success: false,
        code: "INVALID_API_KEY",
        message: "Invalid API key.",
      });
    }

    if (key.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        code: "API_KEY_DISABLED",
        message: "API key is not active.",
      });
    }

    if (!key.user) {
      return res.status(403).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "API key owner not found.",
      });
    }

    if (key.user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: "User account is disabled.",
      });
    }

    req.apiKey = key;

    req.developer = key.user;

    next();

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      code: "API_KEY_ERROR",
      message: "Unable to verify API key.",
    });

  }
};