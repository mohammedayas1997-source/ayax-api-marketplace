const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  createRefundRequest,
  getRefundRequests,
  approveRefund,
  rejectRefund,
} = require("../controllers/refund.controller");

router.post(
  "/",
  auth,
  createRefundRequest
);

router.get(
  "/",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  getRefundRequests
);

router.patch(
  "/:refundId/approve",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  approveRefund
);

router.patch(
  "/:refundId/reject",
  auth,
  role("ADMIN", "SUPER_ADMIN"),
  rejectRefund
);

module.exports = router;