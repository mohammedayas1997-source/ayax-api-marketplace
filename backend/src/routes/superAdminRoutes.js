const express = require("express");
const router = express.Router();

const {
  getSuperAdminDashboard,
} = require("../controllers/superAdminDashboardController");

router.get(
  "/dashboard",
  getSuperAdminDashboard
);

module.exports = router;