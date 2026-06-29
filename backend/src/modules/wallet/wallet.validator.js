const { z } = require("zod");

const amountSchema = z
  .number({
    required_error: "Amount is required",
    invalid_type_error: "Amount must be a number",
  })
  .positive("Amount must be greater than 0");

const fundWalletSchema = z.object({
  amount: amountSchema,
  channel: z.string().optional(),
  proofUrl: z.string().url("Invalid proof URL").optional(),
  note: z.string().optional(),
});

const approveFundingSchema = z.object({
  pin: z.string().min(4, "PIN is required"),
  note: z.string().optional(),
});

const rejectFundingSchema = z.object({
  note: z.string().min(3, "Rejection note is required"),
});

const withdrawWalletSchema = z.object({
  amount: amountSchema,
  bankName: z.string().min(2, "Bank name is required"),
  accountName: z.string().min(2, "Account name is required"),
  accountNumber: z.string().min(5, "Account number is required"),
  note: z.string().optional(),
});

const approveWithdrawalSchema = z.object({
  pin: z.string().min(4, "PIN is required"),
  note: z.string().optional(),
});

const rejectWithdrawalSchema = z.object({
  note: z.string().min(3, "Rejection note is required"),
});

const manualAdjustmentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: z.enum(["CREDIT", "DEBIT"]),
  amount: amountSchema,
  pin: z.string().min(4, "PIN is required"),
  description: z.string().min(3, "Description is required"),
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
  fundWalletSchema,
  approveFundingSchema,
  rejectFundingSchema,
  withdrawWalletSchema,
  approveWithdrawalSchema,
  rejectWithdrawalSchema,
  manualAdjustmentSchema,
};