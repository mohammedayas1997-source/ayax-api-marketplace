const rateLimitMap = new Map();

module.exports = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    try {
      const identifier =
        req.apiKey?.id ||
        req.ip ||
        "anonymous";

      const now = Date.now();

      if (!rateLimitMap.has(identifier)) {
        rateLimitMap.set(identifier, {
          count: 1,
          start: now,
        });

        return next();
      }

      const record = rateLimitMap.get(identifier);

      if (now - record.start > windowMs) {
        rateLimitMap.set(identifier, {
          count: 1,
          start: now,
        });

        return next();
      }

      record.count++;

      if (record.count > maxRequests) {
        return res.status(429).json({
          success: false,
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many API requests.",
          retryAfter: Math.ceil(
            (windowMs - (now - record.start)) / 1000
          ),
        });
      }

      next();

    } catch (err) {
      console.error(err);

      return res.status(500).json({
        success: false,
        message: "Rate limit middleware error.",
      });
    }
  };
};