const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const {
  validate,
  createPlanSchema,
  updatePlanSchema,
  statusSchema,
} = require("./api-plan.validator");

const {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  changeStatus,
  statistics,
} = require("./api-plan.controller");

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
  getPlans
);

router.get(
  "/:id",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getPlan
);

router.post(
  "/",
  auth,
  role("SUPER_ADMIN"),
  validate(createPlanSchema),
  createPlan
);

router.patch(
  "/:id",
  auth,
  role("SUPER_ADMIN"),
  validate(updatePlanSchema),
  updatePlan
);

router.patch(
  "/:id/status",
  auth,
  role("SUPER_ADMIN"),
  validate(statusSchema),
  changeStatus
);

router.delete(
  "/:id",
  auth,
  role("SUPER_ADMIN"),
  deletePlan
);

module.exports = router;