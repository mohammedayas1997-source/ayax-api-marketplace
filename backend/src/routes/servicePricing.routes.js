const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  getPublicPricing,
  getAdminPricing,
  createPricing,
  updatePricing,
  changePricingStatus,
  deletePricing,
} = require("../controllers/servicePricing.controller");

/* ======================================================
   PUBLIC ROUTES (BA BUƘATAR LOGIN KO TOKEN)
   Don Landing Page, Pricing Page da kuma VTU App
====================================================== */

// Duk wanda ya ziyarci shafin ko VTU app zai iya samun farashi a nan
router.get("/", getPublicPricing);
router.get("/public", getPublicPricing);

/* ======================================================
   ADMIN MANAGEMENT ROUTES (PROTECTED)
====================================================== */

router.get(
  "/admin/all",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getAdminPricing
);

router.post(
  "/admin",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  createPricing
);

router.patch(
  "/admin/:id",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  updatePricing
);

router.patch(
  "/admin/:id/status",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  changePricingStatus
);

router.delete(
  "/admin/:id",
  auth,
  role("SUPER_ADMIN"),
  deletePricing
);

module.exports = router;