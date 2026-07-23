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

router.get(
  "/",
  getPlans
);

router.get(
  "/:id",
  getPlanById
);

router.post(
  "/",
  auth,
  createPlan
);

router.patch(
  "/:id",
  auth,
  updatePlan
);

router.patch(
  "/:id/status",
  auth,
  changeStatus
);

router.delete(
  "/:id",
  auth,
  deletePlan
);

module.exports = router;