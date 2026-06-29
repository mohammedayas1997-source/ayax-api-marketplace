const prisma = require("../config/prisma");

const createAuditLog = async ({
  user = null,
  action,
  module,
  description = "",
  ip = null,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: user?.id || null,
        userEmail: user?.email || null,
        action,
        module,
        description,
        ipAddress: ip,
      },
    });
  } catch (error) {
    console.error("Audit Log Error:", error.message);
    // Kar a karya request idan audit logging ya kasa.
  }
};

module.exports = createAuditLog;