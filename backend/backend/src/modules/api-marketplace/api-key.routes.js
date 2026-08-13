const express = require("express");

const router = express.Router();

const auth = require(
  "../../middlewares/auth.middleware"
);

const apiKeyController = require(
  "./api-key.controller"
);

/* ======================================================
   API KEY ROUTES

   Base URL:
   /api/v1/api-keys
====================================================== */

/**
 * GET /api/v1/api-keys
 *
 * Get API keys.
 * Controller/service must restrict normal users
 * to their own keys.
 */
router.get(
  "/",
  auth,
  apiKeyController.getKeys
);

/**
 * GET /api/v1/api-keys/statistics
 *
 * Must be placed before "/:id".
 */
router.get(
  "/statistics",
  auth,
  apiKeyController.statistics
);

/**
 * POST /api/v1/api-keys
 *
 * Create secure API key.
 * Full key is returned only once.
 */
router.post(
  "/",
  auth,
  apiKeyController.createKey
);

/**
 * Compatibility route for old frontend.
 *
 * POST /api/v1/api-keys/generate
 */
router.post(
  "/generate",
  auth,
  apiKeyController.createKey
);

/**
 * GET /api/v1/api-keys/:id
 *
 * Get one API key without exposing its hash.
 */
router.get(
  "/:id",
  auth,
  apiKeyController.getKey
);

/**
 * PATCH /api/v1/api-keys/:id/regenerate
 *
 * Rotate the API key.
 * Previous key stops working immediately.
 */
router.patch(
  "/:id/regenerate",
  auth,
  apiKeyController.regenerateKey
);

/**
 * Alternative rotate endpoint.
 */
router.patch(
  "/:id/rotate",
  auth,
  apiKeyController.regenerateKey
);

/**
 * PATCH /api/v1/api-keys/:id/status
 *
 * Body:
 * {
 *   "status": "ACTIVE" | "REVOKED"
 * }
 */
router.patch(
  "/:id/status",
  auth,
  apiKeyController.changeStatus
);

/**
 * PATCH /api/v1/api-keys/:id/revoke
 *
 * Compatibility route.
 */
router.patch(
  "/:id/revoke",
  auth,
  (req, res, next) => {
    req.body = {
      ...req.body,
      status: "REVOKED",
    };

    return apiKeyController.changeStatus(
      req,
      res,
      next
    );
  }
);

/**
 * DELETE /api/v1/api-keys/:id
 */
router.delete(
  "/:id",
  auth,
  apiKeyController.deleteKey
);

module.exports = router;