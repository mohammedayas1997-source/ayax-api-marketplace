const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  getAuditLogs,
} = require("../controllers/audit.controller");

router.get(
  "/",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  getAuditLogs
);

module.exports = router;