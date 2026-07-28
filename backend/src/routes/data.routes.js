const express = require("express");
const { z } = require("zod");

const router = express.Router();

const apiKeyMiddleware = require(
  "../middlewares/apiKey.middleware"
);

const validate = require(
  "../middlewares/validate.middleware"
);

const dataService = require(
  "../services/data.service"
);

/* ======================================================
   VALIDATION SCHEMAS
====================================================== */

const buyDataSchema = z.object({
  network: z
    .string()
    .trim()
    .min(2, "Network is required")
    .transform((value) =>
      value.toUpperCase()
    ),

  planCode: z
    .string()
    .trim()
    .min(
      1,
      "Plan code is required"
    ),

  phone: z
    .string()
    .trim()
    .regex(
      /^[0-9+]{10,15}$/,
      "Enter a valid phone number"
    ),

  amount: z.coerce
    .number()
    .positive(
      "Amount must be greater than 0"
    ),
});

/* ======================================================
   BUY DATA

   POST /api/v1/data/buy

   Required API-key scope:
   DATA
====================================================== */

router.post(
  "/buy",

  /*
   * Wannan middleware yana:
   * - tabbatar da hashed API key
   * - duba ACTIVE/REVOKED/EXPIRED
   * - duba DATA scope
   * - duba minute/day rate limits
   * - ƙirƙirar API usage log
   */
  apiKeyMiddleware("DATA"),

  validate(buyDataSchema),

  async (req, res) => {
    try {
      const result =
        await dataService.purchaseData({
          /*
           * Sabon middleware yana saka
           * authenticated developer a nan.
           */
          user: req.apiUser,

          apiKey: req.apiKey,

          network:
            req.body.network,

          planCode:
            req.body.planCode,

          phone:
            req.body.phone,

          amount:
            Number(req.body.amount),
        });

      return res.status(200).json({
        success: true,

        message:
          "Data purchase successful.",

        data: result,
      });
    } catch (error) {
      console.error(
        "Data purchase error:",
        error
      );

      const statusCode =
        Number(
          error.statusCode ||
            error.status ||
            400
        );

      return res
        .status(statusCode)
        .json({
          success: false,

          code:
            error.code ||
            "DATA_PURCHASE_FAILED",

          message:
            error.message ||
            "Unable to complete data purchase.",
        });
    }
  }
);

/* ======================================================
   GET DATA TRANSACTIONS

   GET /api/v1/data/transactions

   Required API-key scope:
   DATA
====================================================== */

router.get(
  "/transactions",

  apiKeyMiddleware("DATA"),

  async (req, res) => {
    try {
      const transactions =
        await dataService.getDataTransactions(
          req.apiUser.id
        );

      return res.status(200).json({
        success: true,

        message:
          "Data transactions retrieved successfully.",

        transactions,
      });
    } catch (error) {
      console.error(
        "Get data transactions error:",
        error
      );

      const statusCode =
        Number(
          error.statusCode ||
            error.status ||
            400
        );

      return res
        .status(statusCode)
        .json({
          success: false,

          code:
            error.code ||
            "DATA_TRANSACTIONS_ERROR",

          message:
            error.message ||
            "Unable to retrieve data transactions.",
        });
    }
  }
);

module.exports = router;