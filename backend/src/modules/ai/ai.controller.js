const aiService = require("./ai.service");

const getErrorStatus = (error, defaultStatus = 500) => {
  if (Number.isInteger(error?.statusCode)) {
    return error.statusCode;
  }

  if (Number.isInteger(error?.status)) {
    return error.status;
  }

  return defaultStatus;
};

exports.chat = async (req, res) => {
  try {
    const {
      message,
      conversationId,
      history = [],
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const result = await aiService.chat({
      message,
      history,
      conversationId,
    });

    return res.status(200).json({
      success: true,
      message: "AI response generated successfully.",
      data: {
        conversationId: conversationId || null,
        reply: result.message,
        model: result.model,
        usage: result.usage || null,
      },
    });
  } catch (error) {
    console.error("AI controller error:", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message ||
        "Unable to process AI request.",
    });
  }
};