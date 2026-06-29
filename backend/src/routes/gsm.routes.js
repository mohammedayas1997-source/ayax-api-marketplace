const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  seedSims,
  getSims,
  autoSelectSim,
  buyWithGatewaySim,
} = require("../controllers/gsm.controller");

router.post(
  "/seed",
  auth,
  role("SUPER_ADMIN"),
  seedSims
);

router.get(
  "/sims",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  getSims
);

router.post(
  "/auto-select",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  autoSelectSim
);

router.post(
  "/buy",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  buyWithGatewaySim
);

module.exports = router;