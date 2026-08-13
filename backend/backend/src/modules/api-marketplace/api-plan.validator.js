const { z } = require("zod");

const createPlanSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),

  name: z.string().min(2, "Plan name is required"),

  code: z
    .string()
    .min(2)
    .transform((v) => v.toUpperCase()),

  category: z.string().min(2),

  costPrice: z.number().nonnegative(),

  sellingPrice: z.number().nonnegative(),

  status: z.enum([
    "ACTIVE",
    "DISABLED",
  ]),

  description: z.string().optional(),
});

const updatePlanSchema =
  createPlanSchema.partial();

const statusSchema = z.object({
  status: z.enum([
    "ACTIVE",
    "DISABLED",
  ]),
});

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
  createPlanSchema,
  updatePlanSchema,
  statusSchema,
};