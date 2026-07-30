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

const sendLoginOtpSms = async ({
  user,
  otp,
}) => {
  const normalizedOtp =
    String(otp || "").trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    const error = new Error(
      "A valid 6-digit OTP is required."
    );

    error.code = "INVALID_OTP";
    error.statusCode = 400;

    throw error;
  }

  const phone = normalizePhoneNumber(
    user?.phone
  );

  if (!phone) {
    const error = new Error(
      "A valid user phone number is not available."
    );

    error.code = "PHONE_NOT_AVAILABLE";
    error.statusCode = 400;

    throw error;
  }

  const apiKey = String(
    process.env.TERMII_API_KEY || ""
  ).trim();

  const senderId = String(
    process.env.TERMII_SENDER_ID ||
      "AyaxAPIs"
  ).trim();

  if (!apiKey) {
    const error = new Error(
      "TERMII_API_KEY is not configured."
    );

    error.code =
      "SMS_CONFIGURATION_MISSING";

    error.statusCode = 500;

    throw error;
  }

  if (!senderId) {
    const error = new Error(
      "TERMII_SENDER_ID is not configured."
    );

    error.code =
      "SMS_SENDER_ID_MISSING";

    error.statusCode = 500;

    throw error;
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 20000);

  console.log("TERMII CONFIG:", {
  apiKeyExists: !!process.env.TERMII_API_KEY,
  apiKeyLength: String(process.env.TERMII_API_KEY || "").length,
  apiKeyPrefix: String(process.env.TERMII_API_KEY || "").slice(0, 5),
  senderId: process.env.TERMII_SENDER_ID,
});

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
      const error = new Error(
        data?.message ||
          data?.error ||
          "Unable to send login OTP SMS."
      );

      error.code =
        "TERMII_SMS_REQUEST_FAILED";

      error.statusCode =
        response.status;

      error.response = data;

      throw error;
    }

    /*
     * Wasu providers suna iya dawo da HTTP 200
     * amma body ɗin yana ɗauke da error.
     */
    if (
      data?.code &&
      String(data.code).toLowerCase() !==
        "ok"
    ) {
      const error = new Error(
        data?.message ||
          "Termii rejected the SMS request."
      );

      error.code =
        "TERMII_SMS_REJECTED";

      error.response = data;

      throw error;
    }

    console.log(
      "Login OTP SMS accepted:",
      {
        phone: `${phone.slice(
          0,
          5
        )}*****${phone.slice(-2)}`,

        messageId:
          data?.message_id ||
          data?.messageId ||
          null,
      }
    );

    return {
      success: true,
      messageId:
        data?.message_id ||
        data?.messageId ||
        null,
      data,
    };
  } catch (error) {
    const normalizedError =
      error?.name === "AbortError"
        ? Object.assign(
            new Error(
              "Termii SMS request timed out."
            ),
            {
              code:
                "TERMII_SMS_TIMEOUT",
              statusCode: 504,
            }
          )
        : error;

    console.error(
      "Login OTP SMS error:",
      {
        name:
          normalizedError?.name,

        code:
          normalizedError?.code,

        statusCode:
          normalizedError
            ?.statusCode,

        message:
          normalizedError?.message,

        response:
          normalizedError?.response,
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