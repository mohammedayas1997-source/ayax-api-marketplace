const { z } = require("zod");

const userRoles = [
  "SUPER_ADMIN",
  "ADMIN",
  "STAFF_ADMIN",
  "CUSTOMER_SERVICE",
  "CUSTOMER",
];

const userStatuses = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "BLOCKED",
];

const createUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(userRoles).default("CUSTOMER"),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(userRoles).optional(),
  status: z.enum(userStatuses).optional(),
});

const roleSchema = z.object({
  role: z.enum(userRoles),
});

const statusSchema = z.object({
  status: z.enum(userStatuses),
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
  createUserSchema,
  updateUserSchema,
  roleSchema,
  statusSchema,
};