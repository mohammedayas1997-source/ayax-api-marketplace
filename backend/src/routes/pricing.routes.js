const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  createPlan,
  getPlans,
  getActivePlans,
  updatePlan,
  deletePlan,
  togglePlanStatus,
} = require("../controllers/pricing.controller");

router.get("/active", getActivePlans);

router.get(
  "/",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  getPlans
);

router.post(
  "/",
  auth,
  role("SUPER_ADMIN"),
  createPlan
);

router.patch(
  "/:planId",
  auth,
  role("SUPER_ADMIN"),
  updatePlan
);

router.patch(
  "/:planId/toggle-status",
  auth,
  role("SUPER_ADMIN"),
  togglePlanStatus
);

router.delete(
  "/:planId",
  auth,
  role("SUPER_ADMIN"),
  deletePlan
);

module.exports = router;