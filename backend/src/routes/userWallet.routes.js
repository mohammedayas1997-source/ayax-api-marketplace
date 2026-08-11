const express = require("express");
const router = express.Router();
const { getWallet, getWalletTransactions, createFundingRequest, getMyFundingRequests, initializePaystackFunding, verifyPaystackFunding } = require("../controllers/wallet.controller");
const { protect } = require("../middlewares/auth.middleware");

router.use(protect);

router.get("/", getWallet);
router.get("/transactions", getWalletTransactions);
router.post("/fund", createFundingRequest);
router.get("/funding-requests", getMyFundingRequests);
router.post("/paystack/initialize", initializePaystackFunding);
router.get("/paystack/verify/:reference", verifyPaystackFunding);

module.exports = router;