const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");

const {
  getWallet,
  createFundingRequest,
  getMyFundingRequests,
  getMyTransactions,
  initializePaystackFunding,
  verifyPaystackFunding,
  paystackWebhook,
} = require("../controllers/wallet.controller");

router.get("/", auth, getWallet);
router.post("/fund", auth, createFundingRequest);
router.get("/funding-requests", auth, getMyFundingRequests);
router.get("/transactions", auth, getMyTransactions);
router.post(
  "/paystack/initialize",
  auth,
  initializePaystackFunding
);

router.get(
  "/paystack/verify/:reference",
  auth,
  verifyPaystackFunding
);
router.post(
  "/paystack/webhook",
  paystackWebhook
);

module.exports = router;