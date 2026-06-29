const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");

const {
  getApiKeys,
  generateApiKey,
  revokeApiKey,
} = require("../controllers/apiKey.controller");

router.get("/", auth, getApiKeys);

router.post(
  "/generate",
  auth,
  generateApiKey
);

router.patch(
  "/:id/revoke",
  auth,
  revokeApiKey
);

module.exports = router;