const normalizePhoneNumber = (phone) => {
  let value = String(phone || "")
    .trim()
    .replace(/[^\d+]/g, "");

  if (value.startsWith("+")) {
    value = value.slice(1);
  }

  if (value.startsWith("0")) {
    value = `234${value.slice(1)}`;
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

  error.code = code;

  if (statusCode) {
    error.statusCode = statusCode;
  }

  if (response) {
    error.response = response;
  }

  return error;
};

const sendLoginOtpSms = async ({ user, otp }) => {
  const normalizedOtp = String(
    otp || ""
  ).trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    throw createSmsError({
      message:
        "A valid 6-digit OTP is required.",
      code: "INVALID_OTP",
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
      code: "PHONE_NOT_AVAILABLE",
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
      code: "SMS_SENDER_ID_MISSING",
      statusCode: 500,
    });
  }

  /*
   * Temporary safe log:
   * Wannan ba ya nuna cikakken API key.
   * Cire shi bayan mun gama debugging.
   */
  console.log("TERMII CONFIG:", {
    apiKeyExists: Boolean(apiKey),
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.slice(0, 5),
    senderId,
    phone:
      `${phone.slice(0, 5)}*****` +
      phone.slice(-2),
  });

  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
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

        signal: controller.signal,

        body: JSON.stringify({
          to: phone,
          from: senderId,

          sms:
            `Ayax APIs: Your login verification code is ${normalizedOtp}. ` +
            "It expires in 10 minutes. Do not share this code.",

          type: "plain",
          channel: "dnd",
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
          "Unable to send login OTP SMS.",

        code:
          "TERMII_SMS_REQUEST_FAILED",

        statusCode: response.status,
        response: data,
      });
    }

    /*
     * Kada mu dauki duk wani Termii code
     * a matsayin error. Wasu successful
     * responses suna iya dauke da code.
     */
    const status = String(
      data?.status || ""
    ).toLowerCase();

    if (
      status &&
      ["error", "failed", "failure"].includes(
        status
      )
    ) {
      throw createSmsError({
        message:
          data?.message ||
          "Termii rejected the SMS request.",

        code: "TERMII_SMS_REJECTED",
        statusCode: 502,
        response: data,
      });
    }

    const messageId =
      data?.message_id ||
      data?.messageId ||
      null;

    console.log(
      "Login OTP SMS accepted:",
      {
        phone:
          `${phone.slice(
            0,
            5
          )}*****${phone.slice(-2)}`,

        messageId,
        status:
          data?.status || null,
      }
    );

    return {
      success: true,
      messageId,
      data,
    };
  } catch (error) {
    const normalizedError =
      error?.name === "AbortError"
        ? createSmsError({
            message:
              "Termii SMS request timed out.",
            code: "TERMII_SMS_TIMEOUT",
            statusCode: 504,
          })
        : error;

    console.error(
      "Login OTP SMS error:",
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
      }
    );

    throw normalizedError;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  normalizePhoneNumber,
  sendLoginOtpSms,
};