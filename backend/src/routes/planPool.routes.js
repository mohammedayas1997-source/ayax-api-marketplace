const express = require("express");
const router = express.Router();
const planPoolController = require("../controllers/planPool.controller");

// Hanyar hada ko kara SIMs a karkashin Plan ID
router.post("/assign", planPoolController.assignSimsToPlan);

// Nuna jerin SIMs tare da Balance da Available Status
router.get("/availability", planPoolController.getSimAvailabilityMatrix);

// Dauko dukkan Pools da developer ya tsara
router.get("/pools", planPoolController.getDeveloperPlanPools);

// Cire wani SIM daga karkashin Plan
router.post("/remove-sim", planPoolController.removeSimFromPlan);

module.exports = router;