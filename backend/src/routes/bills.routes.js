const express = require("express");
const { z } = require("zod");
const router = express.Router();

const apiKeyMiddleware = require("../middlewares/apiKey.middleware");
const validate = require("../middlewares/validate.middleware");
const billsController = require("../controllers/bills.controller");

/* ======================================================
   VALIDATION SCHEMAS
====================================================== */
const verifyCableSchema = z.object({
  cableTv: z.enum(["dstv", "gotv", "startimes"]),
  smartCardNo: z.string().trim().min(5, "SmartCard/IUC number is required"),
});

const buyCableSchema = z.object({
  cableTv: z.enum(["dstv", "gotv", "startimes"]),
  packageCode: z.string().trim().min(1, "Package code is required"),
  smartCardNo: z.string().trim().min(5, "SmartCard number is required"),
  phone: z.string().trim().min(10, "Phone number is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  reference: z.string().trim().max(100).optional(),
});

const verifyMeterSchema = z.object({
  disco: z.string().trim().min(2, "DISCO is required"),
  meterNo: z.string().trim().min(5, "Meter number is required"),
  meterType: z.enum(["prepaid", "postpaid"]),
});

const buyElectricitySchema = z.object({
  disco: z.string().trim().min(2, "DISCO is required"),
  meterNo: z.string().trim().min(5, "Meter number is required"),
  meterType: z.enum(["prepaid", "postpaid"]),
  amount: z.coerce.number().min(500, "Minimum electricity purchase is NGN 500"),
  phone: z.string().trim().min(10, "Phone number is required"),
  reference: z.string().trim().max(100).optional(),
});

/* ======================================================
   CABLE TV ROUTES
====================================================== */
router.get("/cable/packages", apiKeyMiddleware("CABLE"), billsController.getCablePackages);
router.post("/cable/verify", apiKeyMiddleware("CABLE"), validate(verifyCableSchema), billsController.verifyCable);
router.post("/cable/buy", apiKeyMiddleware("CABLE"), validate(buyCableSchema), billsController.purchaseCable);

/* ======================================================
   ELECTRICITY ROUTES
====================================================== */
router.get("/electricity/discos", apiKeyMiddleware("ELECTRICITY"), billsController.getElectricityDiscos);
router.post("/electricity/verify", apiKeyMiddleware("ELECTRICITY"), validate(verifyMeterSchema), billsController.verifyMeter);
router.post("/electricity/buy", apiKeyMiddleware("ELECTRICITY"), validate(buyElectricitySchema), billsController.purchaseElectricity);

module.exports = router;