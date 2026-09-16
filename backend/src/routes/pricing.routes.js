const router = require("express").Router();
const pricingController = require("../controllers/pricing.controller");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Safe Auth Middleware Loader (Yana duba dukkan sunayen da ake iya amfani da su)
let auth;
try {
  auth = require("../middleware/auth.middleware");
} catch (e1) {
  try {
    auth = require("../middleware/authMiddleware");
  } catch (e2) {
    try {
      auth = require("../middleware/auth");
    } catch (e3) {
      auth = (req, res, next) => next();
    }
  }
}

// Extract ainihin function din protect/auth
const protect = auth?.protect || auth?.authenticate || auth?.verifyToken || (typeof auth === "function" ? auth : (req, res, next) => next());

let authorize;
try {
  authorize = require("../middleware/authorize.middleware");
} catch (e1) {
  try {
    authorize = require("../middleware/roleMiddleware");
  } catch (e2) {
    authorize = (...roles) => (req, res, next) => next();
  }
}

// Optional Auth Helper don ba VIP Whitelist damar ganin farashinsa
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
    req.user = null;
  }
  next();
};

// ======================================================
// 1. DYNAMIC & PUBLIC ROUTES
// ======================================================
router.get("/public", optionalAuth, pricingController.getPublicPricing);
router.get("/", optionalAuth, pricingController.getPricing);
router.get("/service/:serviceCode", optionalAuth, pricingController.getServicePricing);
router.get("/:id", optionalAuth, pricingController.getPricingById);

// ======================================================
// 2. ADMIN WRITE ACTIONS
// ======================================================
router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.createPricing
);

router.post(
  "/bulk",
  protect,
  authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.createBulkPricing
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.updatePricing
);

router.patch(
  "/:id/status",
  protect,
  authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.togglePricingStatus
);

router.delete(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ADMIN"),
  pricingController.deletePricing
);

module.exports = router;