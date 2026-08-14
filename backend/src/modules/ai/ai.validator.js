const { z } = require("zod");

const chatSchema = z.object({
  message: z
    .string({
      required_error: "Message is required",
      invalid_type_error: "Message must be a string",
    })
    .trim()
    .min(1, "Message cannot be empty")
    .max(4000, "Message is too long"),

  conversationId: z
    .string()
    .trim()
    .optional(),
});

const validateChat = (req, res, next) => {
  try {
    req.body = chatSchema.parse(req.body);
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
  chatSchema,
  validateChat,
};