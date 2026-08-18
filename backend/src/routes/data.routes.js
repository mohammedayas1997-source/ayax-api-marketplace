const express = require("express");
const { z } = require("zod");

const router = express.Router();

const apiKeyMiddleware = require("../middlewares/apiKey.middleware");
const validate = require("../middlewares/validate.middleware");
const dataService = require("../services/data.service");

/* ======================================================
   VALIDATION SCHEMAS
====================================================== */

const buyDataSchema = z.object({
  network: z
    .string()
    .trim()
    .min(2, "Network is required")
    .transform((value) => value.toUpperCase()),

  planCode: z
    .string()
    .trim()
    .min(1, "Plan code is required"),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9+]{10,15}$/, "Enter a valid phone number"),

  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .optional(),

  reference: z
    .string()
    .trim()
    .max(100)
    .optional(),
});

/* ======================================================
   GET DATA PLANS (MARKETPLACE CATALOG)

   GET /api/v1/data/plans
   Required API-key scope: DATA
====================================================== */

router.get(
  "/plans",
  apiKeyMiddleware("DATA"),
  async (req, res) => {
    try {
      const network = req.query.network ? String(req.query.network).toUpperCase() : undefined;
      const plans = await dataService.getDataPlans(network);

      return res.status(200).json({
        success: true,
        message: "Data plans retrieved successfully.",
        count: plans.length,
        plans,
      });
    } catch (error) {
      console.error("Get data plans error:", error);

      const statusCode = Number(error.statusCode || error.status || 500);
      return res.status(statusCode).json({
        success: false,
        code: error.code || "DATA_PLANS_FETCH_FAILED",
        message: error.message || "Unable to retrieve data plans.",
      });
    }
  }
);

/* ======================================================
   BUY DATA

   POST /api/v1/data/buy
   Required API-key scope: DATA
====================================================== */

router.post(
  "/buy",
  apiKeyMiddleware("DATA"),
  validate(buyDataSchema),
  async (req, res) => {
    try {
      const result = await dataService.purchaseData({
        user: req.apiUser || req.user,
        apiKey: req.apiKey,
        network: req.body.network,
        planCode: req.body.planCode,
        phone: req.body.phone,
        amount: req.body.amount ? Number(req.body.amount) : undefined,
        reference: req.body.reference,
      });

      return res.status(200).json({
        success: true,
        message: "Data purchase successful.",
        data: result,
      });
    } catch (error) {
      console.error("Data purchase error:", error);

      const statusCode = Number(error.statusCode || error.status || 400);
      return res.status(statusCode).json({
        success: false,
        code: error.code || "DATA_PURCHASE_FAILED",
        message: error.message || "Unable to complete data purchase.",
      });
    }
  }
);

/* ======================================================
   GET DATA TRANSACTIONS

   GET /api/v1/data/transactions
   Required API-key scope: DATA
====================================================== */

router.get(
  "/transactions",
  apiKeyMiddleware("DATA"),
  async (req, res) => {
    try {
      const userId = (req.apiUser || req.user)?.id;
      const transactions = await dataService.getDataTransactions(userId);

      return res.status(200).json({
        success: true,
        message: "Data transactions retrieved successfully.",
        count: transactions.length,
        transactions,
      });
    } catch (error) {
      console.error("Get data transactions error:", error);

      const statusCode = Number(error.statusCode || error.status || 400);
      return res.status(statusCode).json({
        success: false,
        code: error.code || "DATA_TRANSACTIONS_ERROR",
        message: error.message || "Unable to retrieve data transactions.",
      });
    }
  }
);

module.exports = router;