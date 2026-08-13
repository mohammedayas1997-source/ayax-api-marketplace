const axios = require("axios");
const {
  getReloadlyBaseUrl,
  getReloadlyAuthUrl,
} = require("./utils");

let cachedToken = null;
let tokenExpiry = 0;

const getAccessToken = async () => {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  if (!process.env.RELOADLY_CLIENT_ID || !process.env.RELOADLY_CLIENT_SECRET) {
    throw new Error("Reloadly credentials are missing");
  }

  const res = await axios.post(
    `${getReloadlyAuthUrl()}/oauth/token`,
    {
      client_id: process.env.RELOADLY_CLIENT_ID,
      client_secret: process.env.RELOADLY_CLIENT_SECRET,
      grant_type: "client_credentials",
      audience: getReloadlyBaseUrl(),
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  cachedToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;

  return cachedToken;
};

const getHeaders = async () => {
  const token = await getAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

exports.getOperators = async ({ countryCode }) => {
  const headers = await getHeaders();

  const res = await axios.get(
    `${getReloadlyBaseUrl()}/operators/countries/${countryCode}`,
    { headers }
  );

  return res.data;
};

exports.getOperatorById = async (operatorId) => {
  const headers = await getHeaders();

  const res = await axios.get(
    `${getReloadlyBaseUrl()}/operators/${operatorId}`,
    { headers }
  );

  return res.data;
};

exports.topup = async ({
  operatorId,
  amount,
  recipientPhone,
  recipientCountryCode = "NG",
  senderPhone = "",
  senderCountryCode = "NG",
  customIdentifier,
}) => {
  const headers = await getHeaders();

  const res = await axios.post(
    `${getReloadlyBaseUrl()}/topups`,
    {
      operatorId,
      amount,
      useLocalAmount: true,
      customIdentifier,
      recipientPhone: {
        countryCode: recipientCountryCode,
        number: recipientPhone,
      },
      senderPhone: {
        countryCode: senderCountryCode,
        number: senderPhone,
      },
    },
    { headers }
  );

  return res.data;
};

exports.getTopupStatus = async (transactionId) => {
  const headers = await getHeaders();

  const res = await axios.get(
    `${getReloadlyBaseUrl()}/topups/reports/transactions/${transactionId}`,
    { headers }
  );

  return res.data;
};