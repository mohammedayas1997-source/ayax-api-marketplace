const prisma = require("../config/prisma");

module.exports = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API key is required",
      });
    }

    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!keyRecord || keyRecord.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Invalid or revoked API key",
      });
    }

    req.apiUser = keyRecord.user;
    req.apiKey = keyRecord;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};