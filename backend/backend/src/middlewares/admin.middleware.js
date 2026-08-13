/* ======================================================
   ROLE AUTHORIZATION MIDDLEWARE
====================================================== */

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toUpperCase();

module.exports = (...allowedRoles) => {
  const roles = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHENTICATED",
        message: "Authentication is required.",
      });
    }

    const userRole = normalizeRole(req.user.role);

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        code: "ACCESS_DENIED",
        message: "You do not have permission to access this resource.",
        requiredRoles: roles,
        currentRole: userRole,
      });
    }

    next();
  };
};