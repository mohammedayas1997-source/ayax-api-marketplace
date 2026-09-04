const router = require("express").Router();
const { z } = require("zod");

const identityController = require("../controllers/identity.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const apiKeyMiddleware = require("../middlewares/apiKey.middleware");
const validate = require("../middlewares/validate.middleware");

/* ======================================================
   FLEXIBLE AUTH MIDDLEWARE
   Yana karbar JWT Token (Dashboard Users) ko API Key (Developers)
====================================================== */
const flexibleAuth = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.headers["api-key"];
  if (apiKey) {
    return apiKeyMiddleware("IDENTITY")(req, res, next);
  }
  return authMiddleware(req, res, next);
};

/* ======================================================
   NIGERIAN VALIDATION ISSUE TYPES ENUM
====================================================== */
const VALIDATION_ISSUES = [
  "BANK_MISMATCH",
  "IPE_CLEARANCE",
  "NO_RECORD_FOUND",
  "DOB_MISMATCH",
  "PHOTO_BIOMETRIC_ERROR",
  "PHONE_NOT_LINKED",
  "MULTIPLE_NIN_CONFLICT",
  "BVN_NIN_UNLINKED",
];

/* ======================================================
   VALIDATION SCHEMAS
====================================================== */
const verifyNinSchema = z.object({
  nin: z
    .string()
    .trim()
    .length(11, "A valid 11-digit NIN is required")
    .regex(/^[0-9]{11}$/, "NIN must contain only numbers"),
  slipType: z.string().trim().optional(),
  reference: z.string().trim().max(100).optional(),
});

const verifyBvnSchema = z.object({
  bvn: z
    .string()
    .trim()
    .length(11, "A valid 11-digit BVN is required")
    .regex(/^[0-9]{11}$/, "BVN must contain only numbers"),
  reference: z.string().trim().max(100).optional(),
});

const validateNinSchema = z.object({
  nin: z
    .string()
    .trim()
    .length(11, "A valid 11-digit NIN is required")
    .regex(/^[0-9]{11}$/, "NIN must contain only numbers"),
  issueType: z
    .string()
    .trim()
    .transform((val) => val.toUpperCase())
    .refine((val) => VALIDATION_ISSUES.includes(val), {
      message: `Invalid issueType. Allowed values: ${VALIDATION_ISSUES.join(", ")}`,
    }),
  reference: z.string().trim().max(100).optional(),
});

/* ======================================================
   IDENTITY ROUTES
====================================================== */

// 1. GET ALL VALIDATION ISSUE TYPES (Don Frontend Dropdown)
router.get("/nin/issues", (req, res) => {
  return res.status(200).json({
    status: "success",
    count: VALIDATION_ISSUES.length,
    issues: [
      { code: "BANK_MISMATCH", label: "NIN/Bank Record Mismatch", defaultFee: 1500 },
      { code: "IPE_CLEARANCE", label: "NIMC IPE Clearance", defaultFee: 2000 },
      { code: "NO_RECORD_FOUND", label: "No Record Found Retrieval", defaultFee: 1800 },
      { code: "DOB_MISMATCH", label: "Date of Birth Alignment", defaultFee: 2500 },
      { code: "PHOTO_BIOMETRIC_ERROR", label: "Biometric & Photo Re-upload", defaultFee: 3000 },
      { code: "PHONE_NOT_LINKED", label: "Phone Number Link Issue", defaultFee: 1500 },
      { code: "MULTIPLE_NIN_CONFLICT", label: "Multiple Registration Conflict", defaultFee: 3500 },
      { code: "BVN_NIN_UNLINKED", label: "BVN-NIN Link Resolution", defaultFee: 1200 },
    ],
  });
});

// 2. NIN Verification (Slip & Photo Details)
router.post(
  "/nin/verify",
  flexibleAuth,
  validate(verifyNinSchema),
  identityController.verifyNin
);

// 3. BVN Verification
router.post(
  "/bvn/verify",
  flexibleAuth,
  validate(verifyBvnSchema),
  identityController.verifyBvn
);

// 4. NIN Issue Resolution / Validation
router.post(
  "/nin/validate",
  flexibleAuth,
  validate(validateNinSchema),
  identityController.validateNinIssue
);

module.exports = router;