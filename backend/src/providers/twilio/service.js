const axios = require("axios");

const getAuth = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are missing");
  }

  return {
    accountSid,
    auth: Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
  };
};

exports.sendSMS = async ({
  to,
  body,
  from = process.env.TWILIO_PHONE_NUMBER,
}) => {
  const { accountSid, auth } = getAuth();

  if (!from) {
    throw new Error("Twilio sender phone number is missing");
  }

  const params = new URLSearchParams();
  params.append("To", to);
  params.append("From", from);
  params.append("Body", body);

  const res = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    params,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return res.data;
};

exports.getMessage = async (messageSid) => {
  const { accountSid, auth } = getAuth();

  const res = await axios.get(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageSid}.json`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  return res.data;
};