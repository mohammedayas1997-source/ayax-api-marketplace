const router = require("express").Router();
const pricingController = require("../controllers/pricing.controller");

// Middlewares (Idan kana son kare ayyukan admin kadai)
// const auth = require("../middleware/auth.middleware");
// const authorize = require("../middleware/authorize.middleware");

// ======================================================
// 1. PUBLIC ROUTES (BA BUƘATAR TOKEN KO LOGIN)
// Don Landing Page, Pricing Page da VTU App Lookup
// ======================================================
router.get("/public", pricingController.getPublicPricing);

// ======================================================
// 2. GENERAL & LOOKUP ROUTES
// ======================================================
router.get("/", pricingController.getPricing);
router.get("/service/:serviceCode", pricingController.getServicePricing);
router.get("/:id", pricingController.getPricingById);

// ======================================================
// 3. ADMIN WRITE ACTIONS
// ======================================================
router.post(
  "/",
  // auth,
  // authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.createPricing
);

router.post(
  "/bulk",
  // auth,
  // authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.createBulkPricing
);

router.patch(
  "/:id",
  // auth,
  // authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.updatePricing
);

router.patch(
  "/:id/status",
  // auth,
  // authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.togglePricingStatus
);

router.delete(
  "/:id",
  // auth,
  // authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.deletePricing
);

module.exports = router;