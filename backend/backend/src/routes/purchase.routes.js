const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const { buyApiPlan } = require("../controllers/purchase.controller");

router.post("/buy-plan", auth, buyApiPlan);

module.exports = router;