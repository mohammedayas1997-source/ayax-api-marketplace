const express = require("express");

const router = express.Router();

const auth = require(
  "../middlewares/auth.middleware"
);

const authController = require(
  "../controllers/auth.controller"
);

router.post(
  "/register",
  authController.register
);

router.post(
  "/login",
  authController.login
);

if (
  typeof authController.forgotPassword ===
  "function"
) {
  router.post(
    "/forgot-password",
    authController.forgotPassword
  );
}

if (
  typeof authController.resetPassword ===
  "function"
) {
  router.post(
    "/reset-password",
    authController.resetPassword
  );
}

router.get(
  "/me",
  auth,
  authController.getCurrentUser
);

module.exports = router;