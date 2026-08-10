const express = require("express");
const router = express.Router();

const {
  getWallet,
  getWalletTransactions,
  createFundingRequest,
  getMyFundingRequests,
  initializePaystackFunding,
  verifyPaystackFunding,
} = require("../controllers/wallet.controller");

// Tabbatar an shigo da auth middleware daidai ta hanyar da ta dace da aikin ka
const { protect } = require("../middlewares/auth.middleware"); // Ko da verifyToken kake amfani da shi, tabbatar akwai shi

// Idan kana amfani da 'protect' ko 'verifyToken', tabbatar ba undefined bane
const authMiddleware = protect || exports.verifyToken || ((req, res, next) => next());

// Idan kana son amfani da auth middleware a kan dukkan wallet routes:
if (typeof authMiddleware === "function") {
  router.use(authMiddleware);
}

router.get("/", getWallet);
router.get("/transactions", getWalletTransactions);
router.post("/fund", createFundingRequest);
router.get("/funding-requests", getMyFundingRequests);
router.post("/paystack/initialize", initializePaystackFunding);
router.get("/paystack/verify/:reference", verifyPaystackFunding);

module.exports = router;