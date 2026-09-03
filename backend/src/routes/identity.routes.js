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
  issueType: z.string().trim().min(2, "Issue type is required").optional(),
  reference: z.string().trim().max(100).optional(),
});

/* ======================================================
   IDENTITY ROUTES
====================================================== */
// 1. NIN Verification
router.post(
  "/nin/verify",
  flexibleAuth,
  validate(verifyNinSchema),
  identityController.verifyNin
);

// 2. BVN Verification
router.post(
  "/bvn/verify",
  flexibleAuth,
  validate(verifyBvnSchema),
  identityController.verifyBvn
);

// 3. NIN Issue Resolution / Validation
router.post(
  "/nin/validate",
  flexibleAuth,
  validate(validateNinSchema),
  identityController.validateNinIssue
);

module.exports = router;