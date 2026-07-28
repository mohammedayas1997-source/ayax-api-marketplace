const keyService = require("../modules/api-marketplace/api-key.service");

/* ======================================================
   API KEY AUTHENTICATION MIDDLEWARE
====================================================== */

module.exports = (
  requiredScope = null
) => {
  return async (
    req,
    res,
    next
  ) => {
    try {
      const apiKey =
        String(
          req.headers["x-api-key"] ||
          ""
        ).trim();

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message:
            "API key is required.",
        });
      }

      /*
       * Verify hashed API key.
       */
      const key =
        await keyService.verifyApiKey(
          apiKey
        );

      if (!key) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid, expired or revoked API key.",
        });
      }

      /*
       * Scope check
       */
      if (
        requiredScope &&
        !keyService.hasScope(
          key,
          requiredScope
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This API key does not have permission to access this endpoint.",
        });
      }

      /*
       * Attach authenticated objects
       */
      req.apiKey = key;
      req.apiUser = key.user;
      req.user = key.userSS;

      return next();
    } catch (error) {
      console.error(
        "API Key Middleware:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to authenticate API key.",
      });
    }
  };
};