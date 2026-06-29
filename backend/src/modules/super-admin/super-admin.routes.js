const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const {
  dashboard,
  recentActivity,
  financialSummary,
  systemHealth,
} = require("./super-admin.controller");

// Dashboard Statistics
router.get(
  "/dashboard",
  auth,
  role("SUPER_ADMIN"),
  dashboard
);

// Recent Activities
router.get(
  "/activity",
  auth,
  role("SUPER_ADMIN"),
  recentActivity
);

// Financial Summary
router.get(
  "/finance",
  auth,
  role("SUPER_ADMIN"),
  financialSummary
);

// System Health
router.get(
  "/health",
  auth,
  role("SUPER_ADMIN"),
  systemHealth
);

module.exports = router;