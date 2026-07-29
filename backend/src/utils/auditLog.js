const createAuditLog = async ({
  user,
  action,
  module,
  description,
  ip,
}) => {
  try {
    console.log("AUDIT LOG:", {
      userId: user?.id || null,
      userEmail: user?.email || null,
      action,
      module,
      description,
      ip,
      createdAt: new Date().toISOString(),
    });

    return null;
  } catch (error) {
    console.error(
      "Audit log error:",
      error.message
    );

    return null;
  }
};

module.exports = {
  createAuditLog,
};