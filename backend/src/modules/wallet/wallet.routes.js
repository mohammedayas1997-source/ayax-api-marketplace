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

   Duk routes na wannan wallet module
   suna buƙatar authenticated user.
====================================================== */

router.use(auth);

/* ======================================================
   CURRENT USER WALLET (Root GET /api/v1/wallet)
====================================================== */

router.get(
  "/",
  getMyWallet
);

/* ======================================================
   CURRENT USER WALLET (GET /api/v1/admin/wallet/me)
====================================================== */

router.get(
  "/me",
  getMyWallet
);

/* ======================================================
   ADMIN WALLET STATISTICS

   GET /api/v1/admin/wallet/statistics
====================================================== */

router.get(
  "/statistics",
  role(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  statistics
);

/* ======================================================
   ADMIN WALLET LEDGER

   GET /api/v1/admin/wallet/ledger

   Query examples:
   ?page=1
   ?limit=20
   ?type=CREDIT
   ?search=AYAX
   ?startDate=2026-07-01
   ?endDate=2026-07-31
====================================================== */

router.get(
  "/ledger",
  role(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  getLedger
);

/* ======================================================
   GET A USER WALLET

   GET /api/v1/admin/wallet/user/:userId
====================================================== */

router.get(
  "/user/:userId",
  role(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  getWalletByUserId
);

/* ======================================================
   CREATE FUNDING REQUEST

   POST /api/v1/admin/wallet/funding

   Body example:
   {
     "amount": 5000,
     "channel": "BANK_TRANSFER",
     "proofUrl": "https://...",
     "note": "Wallet funding"
   }
====================================================== */

router.post(
  "/funding",
  validate(fundWalletSchema),
  createFundingRequest
);

/* ======================================================
   GET ALL FUNDING REQUESTS

   GET /api/v1/admin/wallet/funding

   Query examples:
   ?status=PENDING
   ?page=1
   ?limit=20
====================================================== */

router.get(
  "/funding",
  role(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  getFundingRequests
);

/* ======================================================
   APPROVE FUNDING REQUEST

   PATCH /api/v1/admin/wallet/funding/:id/approve

   SUPER_ADMIN ONLY

   Body example:
   {
     "pin": "1234",
     "note": "Payment confirmed"
   }
====================================================== */

router.patch(
  "/funding/:id/approve",
  role("SUPER_ADMIN"),
  validate(approveFundingSchema),
  approveFunding
);

/* ======================================================
   REJECT FUNDING REQUEST

   PATCH /api/v1/admin/wallet/funding/:id/reject

   SUPER_ADMIN ONLY

   Body example:
   {
     "note": "Invalid payment proof"
   }
====================================================== */

router.patch(
  "/funding/:id/reject",
  role("SUPER_ADMIN"),
  validate(rejectFundingSchema),
  rejectFunding
);

/* ======================================================
   CREATE WITHDRAWAL REQUEST

   POST /api/v1/admin/wallet/withdrawal

   Body example:
   {
     "amount": 5000,
     "bankName": "Moniepoint",
     "accountName": "ABDULRAHMAN MOHAMMED",
     "accountNumber": "1234567890"
   }
====================================================== */

router.post(
  "/withdrawal",
  validate(withdrawWalletSchema),
  createWithdrawalRequest
);

/* ======================================================
   GET ALL WITHDRAWAL REQUESTS

   GET /api/v1/admin/wallet/withdrawal

   ADMIN AND SUPER_ADMIN
====================================================== */

router.get(
  "/withdrawal",
  role(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  getWithdrawalRequests
);

/* ======================================================
   APPROVE WITHDRAWAL REQUEST

   PATCH /api/v1/admin/wallet/withdrawal/:id/approve

   SUPER_ADMIN ONLY
====================================================== */

router.patch(
  "/withdrawal/:id/approve",
  role("SUPER_ADMIN"),
  validate(approveWithdrawalSchema),
  approveWithdrawal
);

/* ======================================================
   REJECT WITHDRAWAL REQUEST

   PATCH /api/v1/admin/wallet/withdrawal/:id/reject

   SUPER_ADMIN ONLY
====================================================== */

router.patch(
  "/withdrawal/:id/reject",
  role("SUPER_ADMIN"),
  validate(rejectFundingSchema),
  rejectWithdrawal
);

/* ======================================================
   MANUAL WALLET ADJUSTMENT

   POST /api/v1/admin/wallet/adjust

   SUPER_ADMIN ONLY

   Body example:
   {
     "userId": "USER_ID",
     "type": "CREDIT",
     "amount": 5000,
     "pin": "1234",
     "description": "Manual wallet credit"
   }
====================================================== */

router.post(
  "/adjust",
  role("SUPER_ADMIN"),
  validate(manualAdjustmentSchema),
  manualAdjustment
);

module.exports = router;