const notFound = (req, res, next) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};

const errorHandler = (err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
    stack:
      process.env.NODE_ENV === "development"
        ? err.stack
        : undefined,
  });
};

module.exports = {
  notFound,
  errorHandler,
};