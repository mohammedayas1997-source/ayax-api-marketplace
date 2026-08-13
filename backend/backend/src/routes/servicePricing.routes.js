const express = require("express");

const router = express.Router();

const auth = require(
  "../middlewares/auth.middleware"
);

const role = require(
  "../middlewares/role.middleware"
);

const {
  getPublicPricing,
  getAdminPricing,
  createPricing,
  updatePricing,
  changePricingStatus,
  deletePricing,
} = require(
  "../controllers/servicePricing.controller"
);

/*
 * Developer zai iya ganin enabled
 * pricing bayan login.
 */
router.get(
  "/",
  auth,
  getPublicPricing
);

/*
 * Admin management.
 */
router.get(
  "/admin/all",
  auth,
  role(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  getAdminPricing
);

router.post(
  "/admin",
  auth,
  role(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  createPricing
);

router.patch(
  "/admin/:id",
  auth,
  role(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  updatePricing
);

router.patch(
  "/admin/:id/status",
  auth,
  role(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  changePricingStatus
);

router.delete(
  "/admin/:id",
  auth,
  role("SUPER_ADMIN"),
  deletePricing
);

module.exports = router;