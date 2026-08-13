const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

exports.getAuditLogs = async (
  req,
  res
) => {
  try {
    const logs =
      await prisma.auditLog.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      success: true,
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};