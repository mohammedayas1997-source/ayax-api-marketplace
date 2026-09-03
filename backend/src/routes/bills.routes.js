const express = require("express");
const { z } = require("zod");
const router = express.Router();

const apiKeyMiddleware = require("../middlewares/apiKey.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const billsController = require("../controllers/bills.controller");

/* ======================================================
   FLEXIBLE AUTH MIDDLEWARE
   Yana karbar JWT Token (Dashboard) ko API Key (Developers)
====================================================== */
const flexibleAuth = (scope) => (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.headers["api-key"];
  if (apiKey) {
    return apiKeyMiddleware(scope)(req, res, next);
  }
  return authMiddleware(req, res, next);
};

/* ======================================================
   VALIDATION SCHEMAS
====================================================== */
const verifyCableSchema = z.object({
  cableTv: z
    .string()
    .trim()
    .transform((val) => val.toLowerCase())
    .refine((val) => ["dstv", "gotv", "startimes"].includes(val), {
      message: "cableTv must be either dstv, gotv, or startimes",
    }),
  smartCardNo: z.string().trim().min(5, "SmartCard/IUC number is required"),
});

const buyCableSchema = z.object({
  cableTv: z
    .string()
    .trim()
    .transform((val) => val.toLowerCase())
    .refine((val) => ["dstv", "gotv", "startimes"].includes(val), {
      message: "cableTv must be either dstv, gotv, or startimes",
    }),
  packageCode: z.string().trim().min(1, "Package code is required"),
  smartCardNo: z.string().trim().min(5, "SmartCard number is required"),
  phone: z.string().trim().min(10, "Phone number is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0").optional(),
  reference: z.string().trim().max(100).optional(),
});

const verifyMeterSchema = z.object({
  disco: z
    .string()
    .trim()
    .min(2, "DISCO is required")
    .transform((val) => val.toUpperCase()),
  meterNo: z.string().trim().min(5, "Meter number is required"),
  meterType: z
    .string()
    .trim()
    .transform((val) => val.toLowerCase())
    .refine((val) => ["prepaid", "postpaid"].includes(val), {
      message: "meterType must be either prepaid or postpaid",
    }),
});

const buyElectricitySchema = z.object({
  disco: z
    .string()
    .trim()
    .min(2, "DISCO is required")
    .transform((val) => val.toUpperCase()),
  meterNo: z.string().trim().min(5, "Meter number is required"),
  meterType: z
    .string()
    .trim()
    .transform((val) => val.toLowerCase())
    .refine((val) => ["prepaid", "postpaid"].includes(val), {
      message: "meterType must be either prepaid or postpaid",
    }),
  amount: z.coerce.number().min(500, "Minimum electricity purchase is NGN 500"),
  phone: z.string().trim().min(10, "Phone number is required"),
  reference: z.string().trim().max(100).optional(),
});

/* ======================================================
   CABLE TV ROUTES
====================================================== */
router.get("/cable/packages", flexibleAuth("CABLE"), billsController.getCablePackages);
router.post("/cable/verify", flexibleAuth("CABLE"), validate(verifyCableSchema), billsController.verifyCable);
router.post("/cable/buy", flexibleAuth("CABLE"), validate(buyCableSchema), billsController.purchaseCable);
router.post("/cable/purchase", flexibleAuth("CABLE"), validate(buyCableSchema), billsController.purchaseCable);

/* ======================================================
   ELECTRICITY ROUTES
====================================================== */
router.get("/electricity/discos", flexibleAuth("ELECTRICITY"), billsController.getElectricityDiscos);
router.post("/electricity/verify", flexibleAuth("ELECTRICITY"), validate(verifyMeterSchema), billsController.verifyMeter);
router.post("/electricity/buy", flexibleAuth("ELECTRICITY"), validate(buyElectricitySchema), billsController.purchaseElectricity);
router.post("/electricity/purchase", flexibleAuth("ELECTRICITY"), validate(buyElectricitySchema), billsController.purchaseElectricity);

module.exports = router;