const { z } = require("zod");

const createKeySchema = z.object({
  userId: z.string().min(1, "User ID is required"),

  name: z.string().min(2, "Key name is required"),
});

const regenerateKeySchema = z.object({
  pin: z.string().min(4, "Super Admin PIN is required"),
});

const statusSchema = z.object({
  status: z.enum([
    "ACTIVE",
    "REVOKED",
    "EXPIRED",
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
  createKeySchema,
  regenerateKeySchema,
  statusSchema,
};