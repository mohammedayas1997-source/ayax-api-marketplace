const express = require("express");

const router = express.Router();

const auth = require(
  "../../middlewares/auth.middleware"
);

const {
  getApiKeys,
  generateApiKey,
  regenerateApiKey,
  revokeApiKey,
  deleteApiKey,
} = require(
  "../../controllers/apiKey.controller"
);

router.get(
  "/",
  auth,
  getApiKeys
);

router.post(
  "/",
  auth,
  generateApiKey
);

router.post(
  "/generate",
  auth,
  generateApiKey
);

router.patch(
  "/:id/regenerate",
  auth,
  regenerateApiKey
);

router.patch(
  "/:id/revoke",
  auth,
  revokeApiKey
);

router.delete(
  "/:id",
  auth,
  deleteApiKey
);

module.exports = router;