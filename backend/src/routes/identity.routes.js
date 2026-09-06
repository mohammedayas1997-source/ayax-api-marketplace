const router = require("express").Router();
const { z } = require("zod");

const identityController = require("../controllers/identity.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const apiKeyMiddleware = require("../middlewares/apiKey.middleware");
const validate = require("../middlewares/validate.middleware");

// Flexible Auth Helper
const flexibleAuth = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.headers["api-key"];
  if (apiKey && typeof apiKeyMiddleware === "function") {
    return apiKeyMiddleware("IDENTITY")(req, res, next);
  }
  if (typeof authMiddleware === "function") {
    return authMiddleware(req, res, next);
  }
  return next();
};

// Safe Validator Wrapper
const runValidation = (schema) => {
  if (typeof validate === "function") {
    return validate(schema);
  }
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        errors: parsed.error.format(),
      });
    }
    req.body = parsed.data;
    next();
  };
};

/* ======================================================
   ROUTES
====================================================== */

// 1. NIN Verification (by NIN)
router.post(
  "/nin/verify",
  flexibleAuth,
  runValidation(
    z.object({
      nin: z.string().trim().optional(),
      ninNumber: z.string().trim().optional(),
      searchValue: z.string().trim().optional(),
      slipType: z.string().optional(),
      format: z.string().optional(),
      generatePdf: z.boolean().optional(),
      reference: z.string().optional(),
    }).refine((data) => (data.nin || data.ninNumber || data.searchValue)?.replace(/\D/g, "").length === 11, {
      message: "A valid 11-digit NIN is required",
      path: ["nin"],
    })
  ),
  identityController.verifyNin
);

// 2. NIN Verification by Phone
router.post(
  "/nin/verify-phone",
  flexibleAuth,
  runValidation(
    z.object({
      phone: z.string().trim().optional(),
      phoneNumber: z.string().trim().optional(),
      slipType: z.string().optional(),
      reference: z.string().optional(),
    }).refine((data) => (data.phone || data.phoneNumber)?.replace(/\D/g, "").length >= 10, {
      message: "Valid phone number is required",
      path: ["phone"],
    })
  ),
  identityController.verifyNinByPhone
);

// 3. BVN Verification (by 11-digit BVN)
router.post(
  "/bvn/verify",
  flexibleAuth,
  runValidation(
    z.object({
      bvn: z.string().trim().optional(),
      bvnNumber: z.string().trim().optional(),
      searchValue: z.string().trim().optional(),
      slipType: z.string().optional(),
      format: z.string().optional(),
      generatePdf: z.boolean().optional(),
      reference: z.string().optional(),
    }).refine((data) => (data.bvn || data.bvnNumber || data.searchValue)?.replace(/\D/g, "").length === 11, {
      message: "11-digit BVN is required",
      path: ["bvn"],
    })
  ),
  identityController.verifyBvn
);

// 3b. BVN Verification (by Phone Number) - SABUWAR KAFA
router.post(
  "/bvn/verify-phone",
  flexibleAuth,
  runValidation(
    z.object({
      phone: z.string().trim().optional(),
      phoneNumber: z.string().trim().optional(),
      searchValue: z.string().trim().optional(),
      slipType: z.string().optional(),
      reference: z.string().optional(),
    }).refine((data) => (data.phone || data.phoneNumber || data.searchValue)?.replace(/\D/g, "").length >= 10, {
      message: "A valid linked mobile phone number is required",
      path: ["phone"],
    })
  ),
  identityController.verifyBvnByPhone
);

// 4. NIN Validation (Submit)
router.post(
  "/nin/validate",
  flexibleAuth,
  runValidation(
    z.object({
      nin: z.string().trim().regex(/^[0-9]{11}$/, "11-digit NIN required"),
      errorType: z.string().optional(),
      issueType: z.string().optional(),
      reference: z.string().optional(),
    })
  ),
  identityController.validateNinIssue
);

// 4b. NIN Validation Status
router.post(
  "/nin/validate/status",
  flexibleAuth,
  runValidation(
    z.object({
      ticketId: z.string().optional(),
      transactionId: z.string().optional(),
    })
  ),
  identityController.checkNinValidationStatus
);

// 5. IPE Clearance (Submit)
router.post(
  "/ipe/submit",
  flexibleAuth,
  runValidation(
    z.object({
      trackingID: z.string().trim().min(1),
      reference: z.string().optional(),
    })
  ),
  identityController.submitIpeClearance
);

// 5b. IPE Clearance Status
router.post(
  "/ipe/status",
  flexibleAuth,
  runValidation(
    z.object({
      trackingID: z.string().trim().min(1),
    })
  ),
  identityController.checkIpeStatus
);

// 6. NIN Personalization (Submit)
router.post(
  "/personalization/submit",
  flexibleAuth,
  runValidation(
    z.object({
      trackingId: z.string().trim().min(1),
      reference: z.string().optional(),
    })
  ),
  identityController.submitPersonalization
);

// 6b. NIN Personalization Status
router.post(
  "/personalization/status",
  flexibleAuth,
  runValidation(
    z.object({
      trackingId: z.string().trim().min(1),
    })
  ),
  identityController.checkPersonalizationStatus
);

module.exports = router;