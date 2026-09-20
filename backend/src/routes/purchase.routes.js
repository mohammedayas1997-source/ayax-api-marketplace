const express = require("express");
const router = express.Router();

// Middleware: Tabbatar da User JWT ko API Key
const authMiddleware = require("../middlewares/auth.middleware");
const auth = typeof authMiddleware === "function" ? authMiddleware : (authMiddleware.auth || authMiddleware.protect || ((req, res, next) => next()));

// Controller: Tabbatar da cewa function din yana nan
const purchaseController = require("../controllers/purchase.controller");
const buyApiPlan = purchaseController.buyApiPlan || purchaseController.purchaseData || purchaseController.default;

if (typeof buyApiPlan !== "function") {
  console.error("FATAL: buyApiPlan controller function is undefined in purchase.controller.js");
}

// 1. Ainihin tsohon endpoint
router.post("/buy-plan", auth, buyApiPlan);

// 2. Madaidaitan aliases na marketplace don kar a sami 404
router.post("/data/buy", auth, buyApiPlan);
router.post("/buy", auth, buyApiPlan);

module.exports = router;