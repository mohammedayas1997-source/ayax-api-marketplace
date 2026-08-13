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

const walletController = require("./wallet.controller");

/* ======================================================
   AUTHENTICATION
====================================================== */
router.use(auth);

/* ======================================================
   USER WALLET ROUTES
====================================================== */
router.get("/", walletController.getWallet);

router.get("/me", walletController.getWallet);

router.get("/transactions", walletController.getWalletTransactions || ((req, res) => res.status(501).json({ success: false, message: "Not implemented yet" })));

router.post(
  "/funding",
  validate(fundWalletSchema),
  walletController.createFundingRequest
);

/* ======================================================
   PAYSTACK ROUTES
====================================================== */
router.post(
  "/paystack/initialize",
  walletController.initializePaystackFunding
);

router.get(
  "/paystack/verify/:reference",
  walletController.verifyPaystackFunding
);

router.post(
  "/withdrawal",
  validate(withdrawWalletSchema),
  walletController.createWithdrawalRequest
);

/* ======================================================
   ADMIN WALLET ROUTES
====================================================== */
router.get(
  "/statistics",
  role("SUPER_ADMIN", "ADMIN"),
  walletController.statistics
);

router.get(
  "/ledger",
  role("SUPER_ADMIN", "ADMIN"),
  walletController.getLedger
);

router.get(
  "/user/:userId",
  role("SUPER_ADMIN", "ADMIN"),
  walletController.getWalletByUserId
);

router.get(
  "/funding",
  role("SUPER_ADMIN", "ADMIN"),
  walletController.getMyFundingRequests // Ko zaka iya amfani da getFundingRequests idan akwai na admin
);

router.patch(
  "/funding/:id/approve",
  role("SUPER_ADMIN"),
  validate(approveFundingSchema),
  walletController.approveFunding
);

router.patch(
  "/funding/:id/reject",
  role("SUPER_ADMIN"),
  validate(rejectFundingSchema),
  walletController.rejectFunding
);

router.get(
  "/withdrawal",
  role("SUPER_ADMIN", "ADMIN"),
  walletController.getWithdrawalRequests
);

router.patch(
  "/withdrawal/:id/approve",
  role("SUPER_ADMIN"),
  validate(approveWithdrawalSchema),
  walletController.approveWithdrawal
);

router.patch(
  "/withdrawal/:id/reject",
  role("SUPER_ADMIN"),
  validate(rejectFundingSchema),
  walletController.rejectWithdrawal
);

router.post(
  "/adjust",
  role("SUPER_ADMIN"),
  validate(manualAdjustmentSchema),
  walletController.manualAdjustment
);

module.exports = router;