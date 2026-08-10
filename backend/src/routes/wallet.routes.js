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

const { verifyToken } = require("../middlewares/auth.middleware"); // Ko da wani suna kake amfani da shi na auth middleware

// Duk waɗannan suna buƙatar mutum ya shiga (authenticated)
router.use(verifyToken);

router.get("/", getWallet);
router.get("/transactions", getWalletTransactions);
router.post("/fund", createFundingRequest);
router.get("/funding-requests", getMyFundingRequests);
router.post("/paystack/initialize", initializePaystackFunding);
router.get("/paystack/verify/:reference", verifyPaystackFunding);

module.exports = router;