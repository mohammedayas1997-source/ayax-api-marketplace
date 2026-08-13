const { z } = require("zod");

// ===============================
// Schemas
// ===============================

const createProviderSchema = z.object({
  name: z
    .string()
    .min(2, "Provider name is required"),

  slug: z
    .string()
    .min(2, "Slug is required")
    .transform((v) =>
      v.toLowerCase().replace(/\s+/g, "-")
    ),

  baseUrl: z
    .string()
    .url("Base URL must be valid"),

  apiKey: z
    .string()
    .optional(),

  secretKey: z
    .string()
    .optional(),

  description: z
    .string()
    .optional(),

  status: z.enum([
    "ACTIVE",
    "DISABLED",
    "MAINTENANCE",
  ]),
});

const updateProviderSchema =
  createProviderSchema.partial();

const statusSchema = z.object({
  status: z.enum([
    "ACTIVE",
    "DISABLED",
    "MAINTENANCE",
  ]),
});

// ===============================
// Validator Middleware
// ===============================

const validate =
  (schema) => (req, res, next) => {
    try {
      req.body = schema.parse(req.body);

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }
  };

module.exports = {
  validate,

  createProviderSchema,

  updateProviderSchema,

  statusSchema,
};