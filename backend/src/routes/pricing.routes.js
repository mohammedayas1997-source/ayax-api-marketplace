const router = require("express").Router();
const pricingController = require("../controllers/pricing.controller");

// Middlewares
const auth = require("../middleware/auth.middleware");
let authorize;
try {
  authorize = require("../middleware/authorize.middleware");
} catch (e) {
  authorize = (...roles) => (req, res, next) => next();
}

// Optional Auth Helper: Don gano ko wane user ne ba tare da toshe wadanda basu yi login ba
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default_jwt_secret_key"
      );
      if (decoded && (decoded.id || decoded.userId)) {
        req.user = await prisma.user.findUnique({
          where: { id: decoded.id || decoded.userId },
        });
      }
    }
  } catch (err) {
    // Idan token ya lalace ko babu shi, a bar shi ya wuce a matsayin regular guest
    req.user = null;
  }
  next();
};

// ======================================================
// 1. DYNAMIC & PUBLIC ROUTES (Tare da Ganowar VIP na Sirri)
// ======================================================
// Idan bako ne zai ga regular price, idan whitelist VIP ne zai ga nashi kadai
router.get("/public", optionalAuth, pricingController.getPublicPricing);
router.get("/", optionalAuth, pricingController.getPricing);
router.get("/service/:serviceCode", optionalAuth, pricingController.getServicePricing);
router.get("/:id", optionalAuth, pricingController.getPricingById);

// ======================================================
// 2. ADMIN WRITE ACTIONS (Kare da Tsaro)
// ======================================================
router.post(
  "/",
  auth,
  authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.createPricing
);

router.post(
  "/bulk",
  auth,
  authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.createBulkPricing
);

router.patch(
  "/:id",
  auth,
  authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.updatePricing
);

router.patch(
  "/:id/status",
  auth,
  authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.togglePricingStatus
);

router.delete(
  "/:id",
  auth,
  authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.deletePricing
);

module.exports = router;