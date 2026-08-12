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
const { protect } = require("../../middlewares/auth.middleware");

// Helper don tabbatar cewa function gaske ne kafin a miƙa wa Express
const safeHandler = (fn, fallbackMessage = "Route not implemented") => {
  if (typeof fn === "function") return fn;
  return (req, res) => res.status(501).json({ success: false, message: fallbackMessage });
};

/* ======================================================
   AUTHENTICATION
====================================================== */
router.use(auth);

/* ======================================================
   USER WALLET ROUTES
====================================================== */
router.get("/", safeHandler(walletController.getMyWallet, "getMyWallet missing"));

router.get("/me", safeHandler(walletController.getMyWallet, "getMyWallet missing"));

router.get("/transactions", safeHandler(walletController.getWalletTransactions, "getWalletTransactions missing"));

router.post(
  "/funding",
  validate(fundWalletSchema),
  safeHandler(walletController.createFundingRequest, "createFundingRequest missing")
);

router.post(
  "/withdrawal",
  validate(withdrawWalletSchema),
  safeHandler(walletController.createWithdrawalRequest, "createWithdrawalRequest missing")
);

router.post(
  "/paystack/initialize",
  validate(fundWalletSchema),
  safeHandler(walletController.initializePaystack, "initializePaystack missing")
);
/* ======================================================
   ADMIN WALLET ROUTES
====================================================== */
router.get(
  "/statistics",
  role("SUPER_ADMIN", "ADMIN"),
  safeHandler(walletController.statistics, "statistics missing")
);

router.get(
  "/ledger",
  role("SUPER_ADMIN", "ADMIN"),
  safeHandler(walletController.getLedger, "getLedger missing")
);

router.get(
  "/user/:userId",
  role("SUPER_ADMIN", "ADMIN"),
  safeHandler(walletController.getWalletByUserId, "getWalletByUserId missing")
);

router.get(
  "/funding",
  role("SUPER_ADMIN", "ADMIN"),
  safeHandler(walletController.getFundingRequests, "getFundingRequests missing")
);

router.patch(
  "/funding/:id/approve",
  role("SUPER_ADMIN"),
  validate(approveFundingSchema),
  safeHandler(walletController.approveFunding, "approveFunding missing")
);

router.patch(
  "/funding/:id/reject",
  role("SUPER_ADMIN"),
  validate(rejectFundingSchema),
  safeHandler(walletController.rejectFunding, "rejectFunding missing")
);

router.get(
  "/withdrawal",
  role("SUPER_ADMIN", "ADMIN"),
  safeHandler(walletController.getWithdrawalRequests, "getWithdrawalRequests missing")
);

router.patch(
  "/withdrawal/:id/approve",
  role("SUPER_ADMIN"),
  validate(approveWithdrawalSchema),
  safeHandler(walletController.approveWithdrawal, "approveWithdrawal missing")
);

router.patch(
  "/withdrawal/:id/reject",
  role("SUPER_ADMIN"),
  validate(rejectFundingSchema),
  safeHandler(walletController.rejectWithdrawal, "rejectWithdrawal missing")
);

router.post(
  "/adjust",
  role("SUPER_ADMIN"),
  validate(manualAdjustmentSchema),
  safeHandler(walletController.manualAdjustment, "manualAdjustment missing")
);

module.exports = router;