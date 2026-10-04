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
  changeUserRole,
  assignMarketplaceSimsToPlan,
  getMarketplaceSimAvailability,
  getMarketplacePools,
  refreshAllMarketplaceBalances,
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

/* ======================================================
   CHANGE USER ROLE
   PATCH /api/v1/admin/users/:userId/role
====================================================== */

router.patch(
  "/users/:userId/role",
  auth,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  changeUserRole
);

/* ======================================================
   API MARKETPLACE MASTER SIM POOL ROUTES (ADMIN)
====================================================== */

// Saita ko kara SIMs a Master Pool na Plan
router.post(
  "/gateway/plan-pool/assign",
  auth,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  assignMarketplaceSimsToPlan
);

// Dauko Availability Matrix (Available SIMs vs Assigned Plans)
router.get(
  "/gateway/plan-pool/availability",
  auth,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getMarketplaceSimAvailability
);

// Jerin Dukkan Pools da aka saita a Marketplace
router.get(
  "/gateway/plan-pool/pools",
  auth,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getMarketplacePools
);

// Sabunta Live Balances na dukkan SIMs daga MyMTN
router.post(
  "/gateway/refresh-balances",
  auth,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  refreshAllMarketplaceBalances
);

module.exports = router;