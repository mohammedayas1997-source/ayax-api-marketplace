const axios = require("axios");
const { getMonnifyBaseUrl } = require("./utils");

const getAuthToken = async () => {
  const apiKey = process.env.MONNIFY_API_KEY;
  const secretKey = process.env.MONNIFY_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("Monnify API credentials are missing");
  }

  const auth = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

  const res = await axios.post(
    `${getMonnifyBaseUrl()}/api/v1/auth/login`,
    {},
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  return res.data.responseBody.accessToken;
};

exports.initializeTransaction = async ({
  amount,
  customerName,
  customerEmail,
  paymentReference,
  redirectUrl,
}) => {
  const token = await getAuthToken();

  const res = await axios.post(
    `${getMonnifyBaseUrl()}/api/v1/merchant/transactions/init-transaction`,
    {
      amount,
      customerName,
      customerEmail,
      paymentReference,
      paymentDescription: "Wallet Funding",
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data.responseBody;
};

exports.verifyTransaction = async (paymentReference) => {
  const token = await getAuthToken();

  const res = await axios.get(
    `${getMonnifyBaseUrl()}/api/v2/transactions/${paymentReference}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data.responseBody;
};

exports.createReservedAccount = async ({
  accountReference,
  accountName,
  customerEmail,
  customerName,
}) => {
  const token = await getAuthToken();

  const res = await axios.post(
    `${getMonnifyBaseUrl()}/api/v2/bank-transfer/reserved-accounts`,
    {
      accountReference,
      accountName,
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      customerEmail,
      customerName,
      getAllAvailableBanks: true,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data.responseBody;
};