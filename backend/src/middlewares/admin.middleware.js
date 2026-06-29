module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  if (!["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};