const express = require("express");

const router = express.Router();

const auth = require(
  "../middlewares/auth.middleware"
);

const authorizeRoles = require(
  "../middlewares/role.middleware"
);

const {
  getFundingRequests,
  approveFunding,
  rejectFunding,
} = require(
  "../controllers/admin.controller"
);

/* ======================================================
   GET FUNDING REQUESTS

   GET /api/v1/admin/funding-requests
====================================================== */

router.get(
  "/funding-requests",
  auth,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  getFundingRequests
);

/* ======================================================
   APPROVE FUNDING

   PATCH /api/v1/admin/funding/:fundingId/approve
====================================================== */

router.patch(
  "/funding/:fundingId/approve",
  auth,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  approveFunding
);

/* ======================================================
   REJECT FUNDING

   PATCH /api/v1/admin/funding/:fundingId/reject
====================================================== */

router.patch(
  "/funding/:fundingId/reject",
  auth,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  rejectFunding
);

module.exports = router;