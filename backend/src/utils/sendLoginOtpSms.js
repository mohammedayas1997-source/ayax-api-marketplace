const normalizePhoneNumber = (phone) => {
  let value = String(phone || "")
    .trim()
    .replace(/[^\d+]/g, "");

  if (value.startsWith("+")) {
    value = value.slice(1);
  }

  /*
   * Nigerian local number:
   * 08012345678 -> 2348012345678
   */
  if (value.startsWith("0")) {
    value = `234${value.slice(1)}`;
  }

  /*
   * Idan number ya fara da 2340,
   * cire karin zero ɗin.
   */
  if (value.startsWith("2340")) {
    value = `234${value.slice(4)}`;
  }

  if (!/^\d{10,15}$/.test(value)) {
    return "";
  }

  return value;
};

const parseResponseBody = async (response) => {
  const rawBody = await response.text();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return {
      message: rawBody,
    };
  }
};

const createSmsError = ({
  message,
  code,
  statusCode,
  response,
}) => {
  const error = new Error(message);

  error.name = "LoginOtpSmsError";
  error.code = code;

  if (statusCode) {
    error.statusCode = statusCode;
  }

  if (response) {
    error.response = response;
  }

  return error;
};

const maskPhoneNumber = (phone) => {
  if (!phone || phone.length < 8) {
    return "";
  }

  return (
    `${phone.slice(0, 5)}` +
    "*****" +
    `${phone.slice(-3)}`
  );
};

const sendLoginOtpSms = async ({
  user,
  otp,
}) => {
  const normalizedOtp = String(
    otp || ""
  ).trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    throw createSmsError({
      message:
        "A valid 6-digit OTP is required.",

      code:
        "INVALID_LOGIN_OTP",

      statusCode: 400,
    });
  }

  const phone = normalizePhoneNumber(
    user?.phone
  );

  if (!phone) {
    throw createSmsError({
      message:
        "A valid user phone number is not available.",

      code:
        "PHONE_NOT_AVAILABLE",

      statusCode: 400,
    });
  }

  const apiKey = String(
    process.env.TERMII_API_KEY || ""
  ).trim();

  const senderId = String(
    process.env.TERMII_SENDER_ID ||
      "AyaxAPIs"
  ).trim();

  const channel = String(
    process.env.TERMII_CHANNEL ||
      "dnd"
  )
    .trim()
    .toLowerCase();

  if (!apiKey) {
    throw createSmsError({
      message:
        "TERMII_API_KEY is not configured.",

      code:
        "SMS_CONFIGURATION_MISSING",

      statusCode: 500,
    });
  }

  if (!senderId) {
    throw createSmsError({
      message:
        "TERMII_SENDER_ID is not configured.",

      code:
        "SMS_SENDER_ID_MISSING",

      statusCode: 500,
    });
  }

  const allowedChannels = [
    "dnd",
    "generic",
  ];

  if (!allowedChannels.includes(channel)) {
    throw createSmsError({
      message:
        "TERMII_CHANNEL must be dnd or generic.",

      code:
        "INVALID_TERMII_CHANNEL",

      statusCode: 500,
    });
  }

  console.log("TERMII OTP REQUEST:", {
  apiKeyConfigured: Boolean(apiKey),
  apiKeyLength: apiKey.length,
  apiKeyPrefix: apiKey.slice(0, 7),
  apiKeySuffix: apiKey.slice(-5),
  senderId,
  channel,
  phone: maskPhoneNumber(phone),
});

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(() => {
      controller.abort();
    }, 20000);

  try {
    const response = await fetch(
      "https://api.ng.termii.com/api/sms/send",
      {
        method: "POST",

        headers: {
          Accept: "application/json",

          "Content-Type":
            "application/json",
        },

        signal:
          controller.signal,

        body: JSON.stringify({
          to: phone,

          from: senderId,

          sms:
            `Your Ayax APIs login code is ${normalizedOtp}. ` +
            "It expires in 10 minutes. " +
            "Do not share this code.",

          type: "plain",

          channel,

          api_key: apiKey,
        }),
      }
    );

    const data =
      await parseResponseBody(response);

    if (!response.ok) {
      throw createSmsError({
        message:
          data?.message ||
          data?.error ||
          `Termii returned HTTP ${response.status}.`,

        code:
          response.status === 401
            ? "TERMII_INVALID_API_KEY"
            : "TERMII_SMS_REQUEST_FAILED",

        statusCode:
          response.status,

        response:
          data,
      });
    }

    const status = String(
      data?.status || ""
    )
      .trim()
      .toLowerCase();

    if (
      [
        "error",
        "failed",
        "failure",
        "rejected",
      ].includes(status)
    ) {
      throw createSmsError({
        message:
          data?.message ||
          "Termii rejected the SMS request.",

        code:
          "TERMII_SMS_REJECTED",

        statusCode: 502,

        response:
          data,
      });
    }

    const messageId =
      data?.message_id ||
      data?.messageId ||
      data?.id ||
      null;

    /*
     * Successful HTTP response ba lallai
     * ya nuna SMS ya shiga waya ba.
     * Yana nuna Termii ya karɓi request.
     */
    console.log(
      "LOGIN OTP SMS ACCEPTED:",
      {
        phone:
          maskPhoneNumber(phone),

        messageId,

        status:
          data?.status || null,

        balance:
          data?.balance || null,
      }
    );

    return {
      success: true,

      accepted: true,

      messageId,

      status:
        data?.status || null,

      data,
    };
  } catch (error) {
    const normalizedError =
      error?.name === "AbortError"
        ? createSmsError({
            message:
              "Termii SMS request timed out after 20 seconds.",

            code:
              "TERMII_SMS_TIMEOUT",

            statusCode: 504,
          })
        : error;

    console.error(
      "LOGIN OTP SMS ERROR:",
      {
        name:
          normalizedError?.name ||
          "Error",

        code:
          normalizedError?.code ||
          "UNKNOWN_SMS_ERROR",

        statusCode:
          normalizedError?.statusCode ||
          null,

        message:
          normalizedError?.message ||
          "Unknown SMS error",

        response:
          normalizedError?.response ||
          null,

        phone:
          maskPhoneNumber(phone),

        senderId,

        channel,
      }
    );

    throw normalizedError;
  } finally {
    clearTimeout(timeoutId);
  }
};

module.exports = {
  normalizePhoneNumber,
  sendLoginOtpSms,
};