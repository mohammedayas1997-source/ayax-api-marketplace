const router = require("express").Router();
const { z } = require("zod");

const identityController = require("../controllers/identity.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const apiKeyMiddleware = require("../middlewares/apiKey.middleware");
const validate = require("../middlewares/validate.middleware");

const flexibleAuth = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.headers["api-key"];
  if (apiKey) return apiKeyMiddleware("IDENTITY")(req, res, next);
  return authMiddleware(req, res, next);
};

// 1. Verify NIN
router.post(
  "/nin/verify",
  flexibleAuth,
  validate(
    z.object({
      nin: z.string().trim().regex(/^[0-9]{11}$/, "A valid 11-digit NIN is required"),
      slipType: z.enum(["Standard Slip", "Regular Slip", "Premium Slip", "VNIN Slip"]).optional(),
      reference: z.string().trim().max(100).optional(),
    })
  ),
  identityController.verifyNin
);

// 2. Verify NIN by Phone
router.post(
  "/nin/verify-phone",
  flexibleAuth,
  validate(
    z.object({
      phone: z.string().trim().min(11, "A valid 11-digit phone number is required"),
      slipType: z.enum(["Standard Slip", "Regular Slip", "Premium Slip", "VNIN Slip"]).optional(),
      reference: z.string().trim().max(100).optional(),
    })
  ),
  identityController.verifyNinByPhone
);

// 3. Verify BVN
router.post(
  "/bvn/verify",
  flexibleAuth,
  validate(
    z.object({
      bvn: z.string().trim().regex(/^[0-9]{11}$/, "A valid 11-digit BVN is required"),
      slipType: z.enum(["Standard Slip", "Premium Slip"]).optional(),
      reference: z.string().trim().max(100).optional(),
    })
  ),
  identityController.verifyBvn
);

// 4. NIN Validation (no_record, simbank_validation, modification, photo_error)
router.post(
  "/nin/validate",
  flexibleAuth,
  validate(
    z.object({
      nin: z.string().trim().regex(/^[0-9]{11}$/, "11-digit NIN required"),
      errorType: z.enum(["no_record", "simbank_validation", "modification", "photo_error"]),
      reference: z.string().trim().max(100).optional(),
    })
  ),
  identityController.submitNinValidation
);

router.post(
  "/nin/validate/status",
  flexibleAuth,
  validate(
    z.object({
      ticketId: z.string().trim().optional(),
      transactionId: z.string().trim().optional(),
    }).refine((data) => data.ticketId || data.transactionId, {
      message: "Provide either ticketId or transactionId",
    })
  ),
  identityController.checkNinValidationStatus
);

// 5. IPE Clearance
router.post(
  "/ipe/submit",
  flexibleAuth,
  validate(
    z.object({
      trackingID: z.string().trim().min(1).max(20),
      reference: z.string().trim().max(100).optional(),
    })
  ),
  identityController.submitIpeClearance
);

router.post(
  "/ipe/status",
  flexibleAuth,
  validate(z.object({ trackingID: z.string().trim().min(1) })),
  identityController.checkIpeStatus
);

// 6. NIN Personalization
router.post(
  "/personalization/submit",
  flexibleAuth,
  validate(
    z.object({
      trackingId: z.string().trim().min(10).max(20),
      reference: z.string().trim().max(100).optional(),
    })
  ),
  identityController.submitPersonalization
);

router.post(
  "/personalization/status",
  flexibleAuth,
  validate(z.object({ trackingId: z.string().trim().min(10) })),
  identityController.checkPersonalizationStatus
);

module.exports = router;