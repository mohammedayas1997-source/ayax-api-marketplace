const express = require("express");
const router = express.Router();

let controller;
try {
  controller = require("../controllers/privateTier.controller");
} catch (e) {
  controller = require("../controllers/privateTierController");
}

// Dynamic Auth Middleware Loader don kiyaye MODULE_NOT_FOUND a Linux
let authModule;
const possibleAuthPaths = [
  "../middleware/auth.middleware",
  "../middleware/authMiddleware",
  "../middleware/auth",
  "../middlewares/auth.middleware",
  "../middlewares/authMiddleware",
  "../middlewares/auth",
];

for (const path of possibleAuthPaths) {
  try {
    authModule = require(path);
    if (authModule) break;
  } catch (err) {
    // Ci gaba da nema
  }
}

const authenticateToken =
  authModule?.authenticateToken ||
  authModule?.protect ||
  authModule?.verifyToken ||
  authModule?.authenticate ||
  (typeof authModule === "function" ? authModule : (req, res, next) => next());

const authorizeAdmin =
  authModule?.authorizeAdmin ||
  authModule?.restrictTo?.("SUPER_ADMIN", "ADMIN") ||
  authModule?.authorize?.("SUPER_ADMIN", "ADMIN") ||
  ((req, res, next) => next());

// Route 1: Neman Shiga Tsarin VIP (Dole mai account ya shigar da API key)
router.post(
  "/request-activation",
  authenticateToken,
  controller.submitForPrivateActivation
);

// Route 2: SuperAdmin Duba Jerin Masu Nema
router.get(
  "/admin/requests",
  authenticateToken,
  authorizeAdmin,
  controller.getPendingActivations
);

// Route 3: SuperAdmin Kunna Tsarin (Activate / Approve)
router.post(
  "/admin/activate",
  authenticateToken,
  authorizeAdmin,
  controller.activateUserPrivateTier
);

module.exports = router;