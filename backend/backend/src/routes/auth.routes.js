const express = require("express");

const router = express.Router();

const auth = require(
  "../middlewares/auth.middleware"
);

const authController = require(
  "../controllers/auth.controller"
);

/* ======================================================
   PUBLIC AUTH ROUTES
====================================================== */

/*
 * POST /api/v1/auth/register
 */
router.post(
  "/register",
  authController.register
);

/*
 * POST /api/v1/auth/login
 */
router.post(
  "/login",
  authController.login
);


/*
 * POST /api/v1/auth/login/verify-otp
 */
router.post(
  "/login/verify-otp",
  authController.verifyLoginOtp
);

/*
 * POST /api/v1/auth/login/resend-otp
 */
router.post(
  "/login/resend-otp",
  authController.resendLoginOtp
);
/*
 * POST /api/v1/auth/forgot-password
 *
 * Body:
 * {
 *   "email": "user@example.com"
 * }
 */
router.post(
  "/forgot-password",
  authController.forgotPassword
);

/*
 * POST /api/v1/auth/reset-password
 *
 * Body:
 * {
 *   "token": "reset-token",
 *   "password": "NewPassword123"
 * }
 */
router.post(
  "/reset-password",
  authController.resetPassword
);

/* ======================================================
   PROTECTED AUTH ROUTES
====================================================== */

/*
 * GET /api/v1/auth/me
 */
router.get(
  "/me",
  auth,
  authController.getCurrentUser
);

/*
 * GET /api/v1/auth/profile
 */
router.get(
  "/profile",
  auth,
  authController.getProfile
);

/*
 * PATCH /api/v1/auth/change-password
 *
 * Body:
 * {
 *   "currentPassword": "OldPassword123",
 *   "newPassword": "NewPassword123"
 * }
 */
router.patch(
  "/change-password",
  auth,
  authController.changePassword
);

/*
 * POST /api/v1/auth/logout
 */
router.post(
  "/logout",
  auth,
  authController.logout
);

module.exports = router;