const router = require("express").Router();
const tierController = require("../controllers/tier.controller");
const auth = require("../middlewares/auth.middleware");

router.get("/plans", auth, tierController.getTierPlans);
router.post("/paystack/initialize", auth, tierController.initializeTierPaystack);
router.get("/paystack/verify/:reference", auth, tierController.verifyTierPaystack);

module.exports = router;