const { z } = require("zod");

const createServiceSchema = z.object({
  providerId: z.string().min(1, "Provider ID is required"),

  name: z.string().min(2, "Service name is required"),

  slug: z
    .string()
    .min(2, "Slug is required")
    .transform((v) => v.toLowerCase().replace(/\s+/g, "-")),

  category: z.string().min(2, "Category is required"),

  endpoint: z.string().min(1, "Endpoint is required"),

  method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]).default("POST"),

  status: z.enum(["ACTIVE", "DISABLED", "MAINTENANCE"]).default("ACTIVE"),

  description: z.string().optional(),
});

const updateServiceSchema = createServiceSchema.partial();

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED", "MAINTENANCE"]),
});

const validate = (schema) => (req, res, next) => {
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
  createServiceSchema,
  updateServiceSchema,
  statusSchema,
};