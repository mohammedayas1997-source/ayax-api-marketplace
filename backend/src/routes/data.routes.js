const express = require("express");
const { z } = require("zod");

const router = express.Router();

const apiKeyMiddleware = require("../middlewares/api/apiKey.middleware");
const rateLimitMiddleware = require("../middlewares/api/rateLimit.middleware");
const usageMiddleware = require("../middlewares/api/usage.middleware");

const dataService = require("../services/data.service");
const validate = require("../middlewares/validate.middleware");

const buyDataSchema = z.object({
  network: z.string().min(2, "Network is required"),
  planCode: z.string().min(1, "Plan code is required"),
  phone: z.string().min(10, "Phone number is required"),
  amount: z.number().positive("Amount must be greater than 0"),
});

router.post(
  "/buy",
  apiKeyMiddleware,
  rateLimitMiddleware(100, 60000),
  usageMiddleware,
  validate(buyDataSchema),
  async (req, res) => {
    try {
      const result = await dataService.purchaseData({
        user: req.developer,
        ...req.body,
      });

      return res.json({
        success: true,
        message: "Data purchase successful",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.get(
  "/transactions",
  apiKeyMiddleware,
  rateLimitMiddleware(100, 60000),
  async (req, res) => {
    try {
      const transactions = await dataService.getDataTransactions(
        req.developer.id
      );

      return res.json({
        success: true,
        transactions,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;