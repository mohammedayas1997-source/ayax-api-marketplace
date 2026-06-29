const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const { dashboard } = require("./api-marketplace-dashboard.controller");

router.get(
  "/dashboard",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  dashboard
);

module.exports = router;
