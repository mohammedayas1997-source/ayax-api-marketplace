const router = require("express").Router();

const pricingController = require("../controllers/pricing.controller");

// Idan kana da auth middleware ka cire comment
// const auth = require("../middleware/auth.middleware");
// const authorize = require("../middleware/authorize.middleware");

// router.use(auth);

router.get("/", pricingController.getPricing);

router.get(
  "/service/:serviceCode",
  pricingController.getServicePricing
);

router.get(
  "/:id",
  pricingController.getPricingById
);

router.post(
  "/",
  // authorize("SUPER_ADMIN"),
  pricingController.createPricing
);

router.patch(
  "/:id",
  // authorize("SUPER_ADMIN"),
  pricingController.updatePricing
);

router.patch(
  "/:id/status",
  // authorize("SUPER_ADMIN"),
  pricingController.togglePricingStatus
);

router.delete(
  "/:id",
  // authorize("SUPER_ADMIN"),
  pricingController.deletePricing
);

module.exports = router;