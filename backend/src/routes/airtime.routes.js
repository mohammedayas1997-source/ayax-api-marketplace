const express = require("express");
const { z } = require("zod");

const router = express.Router();

const apiKeyMiddleware = require("../middlewares/apiKey.middleware");
const validate = require("../middlewares/validate.middleware");
const airtimeService = require("../services/airtime.service");

/* ======================================================
   VALIDATION SCHEMA
====================================================== */

const buyAirtimeSchema = z.object({
  network: z
    .string()
    .trim()
    .min(2, "Network is required")
    .transform((value) => value.toUpperCase()),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9+]{10,15}$/, "Enter a valid phone number"),

  amount: z.coerce
    .number()
    .min(50, "Amount must be at least NGN 50"),

  reference: z
    .string()
    .trim()
    .max(100)
    .optional(),
});

/* ======================================================
   BUY AIRTIME

   POST /api/v1/airtime/buy
   Required API-key scope: AIRTIME
====================================================== */

router.post(
  "/buy",
  apiKeyMiddleware("AIRTIME"),
  validate(buyAirtimeSchema),
  async (req, res) => {
    try {
      const result = await airtimeService.purchaseAirtime({
        user: req.apiUser || req.user,
        apiKey: req.apiKey,
        network: req.body.network,
        phone: req.body.phone,
        amount: Number(req.body.amount),
        reference: req.body.reference,
      });

      return res.status(200).json({
        success: true,
        message: "Airtime purchase successful.",
        data: result,
      });
    } catch (error) {
      console.error("Airtime purchase error:", error);

      const statusCode = Number(error.statusCode || error.status || 400);

      return res.status(statusCode).json({
        success: false,
        code: error.code || "AIRTIME_PURCHASE_FAILED",
        message: error.message || "Unable to complete airtime purchase.",
      });
    }
  }
);

/* ======================================================
   GET AIRTIME TRANSACTIONS

   GET /api/v1/airtime/transactions
   Required API-key scope: AIRTIME
====================================================== */

router.get(
  "/transactions",
  apiKeyMiddleware("AIRTIME"),
  async (req, res) => {
    try {
      const userId = (req.apiUser || req.user)?.id;

      const transactions = await airtimeService.getAirtimeTransactions(userId);

      return res.status(200).json({
        success: true,
        message: "Airtime transactions retrieved successfully.",
        count: transactions.length,
        transactions,
      });
    } catch (error) {
      console.error("Get airtime transactions error:", error);

      const statusCode = Number(error.statusCode || error.status || 400);

      return res.status(statusCode).json({
        success: false,
        code: error.code || "AIRTIME_TRANSACTIONS_ERROR",
        message: error.message || "Unable to retrieve airtime transactions.",
      });
    }
  }
);

module.exports = router;