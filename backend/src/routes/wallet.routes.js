const express = require("express");

const router = express.Router();

const auth = require(
  "../middlewares/auth.middleware"
);

const {
  getWallet,
  createFundingRequest,
  getMyFundingRequests,
  getWalletTransactions,
  initializePaystackFunding,
  verifyPaystackFunding,
  paystackWebhook,
} = require(
  "../controllers/wallet.controller"
);

router.get(
  "/",
  auth,
  getWallet
);

router.get(
  "/transactions",
  auth,
  getWalletTransactions
);

router.post(
  "/fund",
  auth,
  createFundingRequest
);

router.get(
  "/funding-requests",
  auth,
  getMyFundingRequests
);

// An gyara wannan layin daga verifyToken zuwa auth domin hana Server Error
router.post(
  "/funding",
  auth,
  initializePaystackFunding
);

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