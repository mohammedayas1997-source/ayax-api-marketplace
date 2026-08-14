const axios = require("axios");

const {
  AYAX_AI_SYSTEM_PROMPT,
} = require("./ai.prompt");

const OPENAI_API_URL =
  "https://api.openai.com/v1/chat/completions";

const getOpenAIConfig = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "OPENAI_API_KEY is not configured."
    );

    error.statusCode = 500;

    throw error;
  }

  return {
    apiKey,
    model:
      process.env.OPENAI_AI_MODEL ||
      "gpt-4o-mini",
  };
};

const cleanMessage = (message) => {
  return String(message || "")
    .trim()
    .slice(0, 4000);
};

const buildMessages = ({
  message,
  history = [],
}) => {
  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (item) =>
            item &&
            ["user", "assistant"].includes(
              item.role
            ) &&
            typeof item.content === "string"
        )
        .slice(-10)
    : [];

  return [
    {
      role: "system",
      content: AYAX_AI_SYSTEM_PROMPT,
    },

    ...safeHistory.map((item) => ({
      role: item.role,
      content: String(item.content).slice(
        0,
        4000
      ),
    })),

    {
      role: "user",
      content: cleanMessage(message),
    },
  ];
};

exports.chat = async ({
  message,
  history = [],
}) => {
  const { apiKey, model } =
    getOpenAIConfig();

  const messages = buildMessages({
    message,
    history,
  });

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model,
        messages,
        temperature: 0.2,
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        timeout: 30000,
      }
    );

    const assistantMessage =
      response.data?.choices?.[0]?.message
        ?.content;

    if (!assistantMessage) {
      const error = new Error(
        "AI returned an empty response."
      );

      error.statusCode = 502;

      throw error;
    }

    return {
      message: assistantMessage.trim(),
      model:
        response.data?.model || model,
      usage:
        response.data?.usage || null,
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    console.error(
      "OpenAI request error:",
      error.response?.data ||
        error.message
    );

    const apiMessage =
      error.response?.data?.error?.message;

    const finalError = new Error(
      apiMessage ||
        "Unable to communicate with Ayax AI."
    );

    finalError.statusCode =
      error.response?.status || 502;

    throw finalError;
  }
};