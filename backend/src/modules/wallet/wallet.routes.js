const express = require("express");
const router = express.Router();

const auth = require(
  "../../middlewares/auth.middleware"
);

const role = require(
  "../../middlewares/role.middleware"
);

const {
  validate,
  fundWalletSchema,
  approveFundingSchema,
  rejectFundingSchema,
  withdrawWalletSchema,
  approveWithdrawalSchema,
  rejectWithdrawalSchema,
  manualAdjustmentSchema,
} = require("./wallet.validator");

const {
  getMyWallet,
  getWalletTransactions, // Wannan shine wanda ke kawo matsala idan babu shi
  getWalletByUserId,

  createFundingRequest,
  getFundingRequests,
  approveFunding,
  rejectFunding,

  createWithdrawalRequest,
  getWithdrawalRequests,
  approveWithdrawal,
  rejectWithdrawal,

  manualAdjustment,
  getLedger,
  statistics,
} = require("./wallet.controller");

/* ======================================================
   AUTHENTICATION
   Duk routes na wannan wallet module suna buƙatar authenticated user.
====================================================== */

router.use(auth);

/* ======================================================
   USER WALLET ROUTES (/api/v1/wallet/...)
====================================================== */

// 1. Samun bayanan wallet ɗin mai amfani
router.get(
  "/",
  getMyWallet
);

router.get(
  "/me",
  getMyWallet
);

// 2. Samun lissafin transactions na mai amfani (Wannan shine babban abin da frontend ke nema)
router.get(
  "/transactions",
  getWalletTransactions
);

// 3. Ƙirƙirar buƙatar ƙara kuɗi (Funding request)
router.post(
  "/funding",
  validate(fundWalletSchema),
  createFundingRequest
);

// 4. Ƙirƙirar buƙatar cire kuɗi (Withdrawal request)
router.post(
  "/withdrawal",
  validate(withdrawWalletSchema),
  createWithdrawalRequest
);


/* ======================================================
   ADMIN WALLET ROUTES (/api/v1/admin/wallet/...)
====================================================== */

router.get(
  "/statistics",
  role("SUPER_ADMIN", "ADMIN"),
  statistics
);

router.get(
  "/ledger",
  role("SUPER_ADMIN", "ADMIN"),
  getLedger
);

router.get(
  "/user/:userId",
  role("SUPER_ADMIN", "ADMIN"),
  getWalletByUserId
);

router.get(
  "/funding",
  role("SUPER_ADMIN", "ADMIN"),
  getFundingRequests
);

router.patch(
  "/funding/:id/approve",
  role("SUPER_ADMIN"),
  validate(approveFundingSchema),
  approveFunding
);

router.patch(
  "/funding/:id/reject",
  role("SUPER_ADMIN"),
  validate(rejectFundingSchema),
  rejectFunding
);

router.get(
  "/withdrawal",
  role("SUPER_ADMIN", "ADMIN"),
  getWithdrawalRequests
);

router.patch(
  "/withdrawal/:id/approve",
  role("SUPER_ADMIN"),
  validate(approveWithdrawalSchema),
  approveWithdrawal
);

router.patch(
  "/withdrawal/:id/reject",
  role("SUPER_ADMIN"),
  validate(rejectFundingSchema),
  rejectWithdrawal
);

router.post(
  "/adjust",
  role("SUPER_ADMIN"),
  validate(manualAdjustmentSchema),
  manualAdjustment
);

module.exports = router;