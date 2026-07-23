const express = require("express");

const router = express.Router();

const auth = require(
  "../middlewares/auth.middleware"
);

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} = require(
  "../controllers/auth.controller"
);

router.post(
  "/register",
  register
);

router.post(
  "/login",
  login
);

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/reset-password",
  resetPassword
);

router.get(
  "/me",
  auth,
  getCurrentUser
);

module.exports = router;