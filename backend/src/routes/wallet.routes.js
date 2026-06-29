const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");

const {
  getWallet,
  createFundingRequest,
  getMyFundingRequests,
  getMyTransactions,
} = require("../controllers/wallet.controller");

router.get("/", auth, getWallet);
router.post("/fund", auth, createFundingRequest);
router.get("/funding-requests", auth, getMyFundingRequests);
router.get("/transactions", auth, getMyTransactions);

module.exports = router;