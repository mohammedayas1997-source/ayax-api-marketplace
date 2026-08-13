const axios = require("axios");
const { getTermiiBaseUrl } = require("./utils");

const getApiKey = () => {
  if (!process.env.TERMII_API_KEY) {
    throw new Error("Termii API key is missing");
  }

  return process.env.TERMII_API_KEY;
};

exports.sendSMS = async ({
  to,
  from = "AYAX",
  sms,
  type = "plain",
  channel = "generic",
}) => {
  const res = await axios.post(`${getTermiiBaseUrl()}/sms/send`, {
    to,
    from,
    sms,
    type,
    channel,
    api_key: getApiKey(),
  });

  return res.data;
};

exports.sendToken = async ({
  phoneNumber,
  pinAttempts = 3,
  pinTimeToLive = 5,
  pinLength = 6,
  pinPlaceholder = "< 1234 >",
  messageText = "Your verification code is < 1234 >",
  from = "AYAX",
  channel = "generic",
}) => {
  const res = await axios.post(`${getTermiiBaseUrl()}/sms/otp/send`, {
    api_key: getApiKey(),
    message_type: "NUMERIC",
    to: phoneNumber,
    from,
    channel,
    pin_attempts: pinAttempts,
    pin_time_to_live: pinTimeToLive,
    pin_length: pinLength,
    pin_placeholder: pinPlaceholder,
    message_text: messageText,
    pin_type: "NUMERIC",
  });

  return res.data;
};

exports.verifyToken = async ({ pinId, pin }) => {
  const res = await axios.post(`${getTermiiBaseUrl()}/sms/otp/verify`, {
    api_key: getApiKey(),
    pin_id: pinId,
    pin,
  });

  return res.data;
};

exports.getBalance = async () => {
  const res = await axios.get(
    `${getTermiiBaseUrl()}/get-balance?api_key=${getApiKey()}`
  );

  return res.data;
};