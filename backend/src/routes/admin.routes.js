const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  getFundingRequests,
  approveFunding,
  rejectFunding,
} = require("../controllers/admin.controller");

router.get(
  "/funding-requests",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  getFundingRequests
);

router.patch(
  "/funding/:fundingId/approve",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  approveFunding
);

router.patch(
  "/funding/:fundingId/reject",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  rejectFunding
);

module.exports = router;