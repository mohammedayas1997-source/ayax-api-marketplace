const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

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

// ======================================================
// WALLET DASHBOARD
// ======================================================

router.get(
  "/me",
  auth,
  getMyWallet
);

router.get(
  "/statistics",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  statistics
);

router.get(
  "/ledger",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getLedger
);

router.get(
  "/user/:userId",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getWalletByUserId
);

// ======================================================
// FUNDING REQUESTS
// ======================================================

router.post(
  "/funding",
  auth,
  validate(fundWalletSchema),
  createFundingRequest
);

router.get(
  "/funding",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getFundingRequests
);

router.patch(
  "/funding/:id/approve",
  auth,
  role("SUPER_ADMIN"),
  validate(approveFundingSchema),
  approveFunding
);

router.patch(
  "/funding/:id/reject",
  auth,
  role("SUPER_ADMIN"),
  validate(rejectFundingSchema),
  rejectFunding
);

// ======================================================
// WITHDRAWAL REQUESTS
// ======================================================

router.post(
  "/withdrawal",
  auth,
  validate(withdrawWalletSchema),
  createWithdrawalRequest
);

router.get(
  "/withdrawal",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getWithdrawalRequests
);

router.patch(
  "/withdrawal/:id/approve",
  auth,
  role("SUPER_ADMIN"),
  validate(approveWithdrawalSchema),
  approveWithdrawal
);

router.patch(
  "/withdrawal/:id/reject",
  auth,
  role("SUPER_ADMIN"),
  validate(rejectWithdrawalSchema),
  rejectWithdrawal
);

// ======================================================
// MANUAL WALLET ADJUSTMENT
// ======================================================

router.post(
  "/adjust",
  auth,
  role("SUPER_ADMIN"),
  validate(manualAdjustmentSchema),
  manualAdjustment
);

module.exports = router;