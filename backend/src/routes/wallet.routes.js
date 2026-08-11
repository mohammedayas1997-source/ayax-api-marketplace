const express = require("express");
const router = express.Router();

const {
  getWallet,
  getWalletTransactions,
  createFundingRequest,
  getMyFundingRequests,
  initializePaystackFunding,
  verifyPaystackFunding,
  getLedger, // Tabbatar an kawo shi daga controller idan kana son amfani da shi
} = require("../controllers/wallet.controller");

// Tabbatar an shigo da auth middleware daidai
const { protect } = require("../middlewares/auth.middleware"); 

const authMiddleware = protect || exports.verifyToken || ((req, res, next) => next());

if (typeof authMiddleware === "function") {
  router.use(authMiddleware);
}

/* ======================================================
   WALLET ROUTES
====================================================== */

router.get("/", getWallet);

// Zabi daya tsakanin getWalletTransactions ko getLedger gwargwadon abin da kake so
router.get("/transactions", getWalletTransactions); 

router.post("/fund", createFundingRequest);
router.get("/funding-requests", getMyFundingRequests);
router.post("/paystack/initialize", initializePaystackFunding);
router.get("/paystack/verify/:reference", verifyPaystackFunding);

module.exports = router;