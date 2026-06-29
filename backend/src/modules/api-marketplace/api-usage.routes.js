const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const {
  getUsageLogs,
  getUsage,
  statistics,
} = require("./api-usage.controller");

router.get(
  "/statistics",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  statistics
);

router.get(
  "/",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getUsageLogs
);

router.get(
  "/:id",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getUsage
);

module.exports = router;