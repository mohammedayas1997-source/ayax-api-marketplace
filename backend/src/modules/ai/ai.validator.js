const { z } = require("zod");

const chatSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Message cannot be empty")
      .max(4000, "Message is too long")
      .optional(),

    prompt: z
      .string()
      .trim()
      .min(1, "Prompt cannot be empty")
      .max(4000, "Prompt is too long")
      .optional(),

    conversationId: z
      .string()
      .trim()
      .optional(),
  })
  .transform((data) => ({
    message: data.message || data.prompt,
    conversationId: data.conversationId,
  }))
  .refine(
    (data) =>
      typeof data.message === "string" &&
      data.message.trim().length > 0,
    {
      message: "Message is required",
      path: ["message"],
    }
  );

const validateChat = (req, res, next) => {
  try {
    req.body = chatSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.errors || error.issues,
    });
  }
};

module.exports = {
  chatSchema,
  validateChat,
};