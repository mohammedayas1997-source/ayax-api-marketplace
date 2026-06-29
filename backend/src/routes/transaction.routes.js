const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");

const {
  getTransactions,
  getTransactionByReference,
} = require("../controllers/transaction.controller");

router.get("/", auth, getTransactions);

router.get(
  "/:reference",
  auth,
  getTransactionByReference
);

module.exports = router;