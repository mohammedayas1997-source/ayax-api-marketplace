const router = require("express").Router();

const auth = require("../middlewares/auth.middleware");

const {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  changeStatus,
} = require("../controllers/apiPlan.controller");

router.get("/", auth, getPlans);

router.post("/", auth, createPlan);

router.patch("/:id", auth, updatePlan);

router.patch("/:id/status", auth, changeStatus);

router.delete("/:id", auth, deletePlan);

module.exports = router;