const express = require("express");
const { z } = require("zod");

const router = express.Router();

const apiKeyMiddleware = require("../middlewares/apiKey.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const dataService = require("../services/data.service");

/* ======================================================
   FLEXIBLE AUTH MIDDLEWARE
   Yana karbar JWT Token (Dashboard) ko API Key (Developers)
====================================================== */
const flexibleAuth = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.headers["api-key"];
  if (apiKey) {
    return apiKeyMiddleware("DATA")(req, res, next);
  }
  return authMiddleware(req, res, next);
};

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
    .regex(/^[0-9+]{10,15}$/, "Enter a valid phone number")
    .optional(),

  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9+]{10,15}$/, "Enter a valid phone number")
    .optional(),

  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .optional(),

  reference: z
    .string()
    .trim()
    .max(100)
    .optional(),
}).refine((data) => data.phone || data.phoneNumber, {
  message: "Phone number is required",
  path: ["phone"],
});

/* ======================================================
   SHARED PURCHASE HANDLER
====================================================== */
const handleBuyData = async (req, res) => {
  try {
    const result = await dataService.purchaseData({
      user: req.apiUser || req.user,
      apiKey: req.apiKey,
      network: req.body.network,
      planCode: req.body.planCode,
      phone: req.body.phone || req.body.phoneNumber,
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
};

/* ======================================================
   ROUTES
====================================================== */

// 1. GET DATA PLANS (CATALOG)
router.get("/plans", flexibleAuth, async (req, res) => {
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
});

// 2. BUY DATA (DEVELOPER B2B API)
router.post("/buy", apiKeyMiddleware("DATA"), validate(buyDataSchema), handleBuyData);

// 3. PURCHASE DATA (DASHBOARD JWT OR API KEY)
router.post("/purchase", flexibleAuth, validate(buyDataSchema), handleBuyData);

// 4. GET DATA TRANSACTIONS
router.get("/transactions", flexibleAuth, async (req, res) => {
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
});

module.exports = router;