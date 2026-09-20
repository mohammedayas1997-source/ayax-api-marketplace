const express = require("express");

const router = express.Router();

const auth = require(
  "../middlewares/auth.middleware"
);

const {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  changeStatus,
  deletePlan,
} = require(
  "../controllers/apiPlan.controller"
);

/* =========================================================================
   PUBLIC / DEVELOPER MARKETPLACE CATALOG ROUTES
========================================================================= */

// GET /api/v1/plans (Supports ?networkId=1&category=DATA&search=MTN)
router.get(
  "/",
  getPlans
);

// GET /api/v1/plans/catalog (Marketplace alias)
router.get(
  "/catalog",
  getPlans
);

// GET /api/v1/plans/:id (Get single plan details)
router.get(
  "/:id",
  getPlanById
);

/* =========================================================================
   ADMIN / AUTHORIZED PLAN CONFIGURATION ROUTES
========================================================================= */

// POST /api/v1/plans (Create new Network / API Plan)
router.post(
  "/",
  auth,
  createPlan
);

// POST /api/v1/plans/create (Alias for frontend forms)
router.post(
  "/create",
  auth,
  createPlan
);

// PATCH /api/v1/plans/:id (Update plan pricing, volume, USSD/Gateway codes)
router.patch(
  "/:id",
  auth,
  updatePlan
);

// PUT /api/v1/plans/:id (RESTful update alias)
router.put(
  "/:id",
  auth,
  updatePlan
);

// PATCH /api/v1/plans/:id/status (Toggle ACTIVE / DISABLED status)
router.patch(
  "/:id/status",
  auth,
  changeStatus
);

// DELETE /api/v1/plans/:id (Remove plan completely)
router.delete(
  "/:id",
  auth,
  deletePlan
);

// POST /api/v1/plans/delete/:id (Form delete alias)
router.post(
  "/delete/:id",
  auth,
  deletePlan
);

module.exports = router;