const axios = require("axios");
const { getPaystackBaseUrl } = require("./utils");

const getHeaders = () => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error("Paystack secret key is missing");
  }

  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
};

exports.initializeTransaction = async ({
  amount,
  email,
  reference,
  callbackUrl,
  metadata = {},
}) => {
  const res = await axios.post(
    `${getPaystackBaseUrl()}/transaction/initialize`,
    {
      email,
      amount: Number(amount) * 100,
      reference,
      callback_url: callbackUrl,
      metadata,
    },
    {
      headers: getHeaders(),
    }
  );

  return res.data.data;
};

exports.verifyTransaction = async (reference) => {
  const res = await axios.get(
    `${getPaystackBaseUrl()}/transaction/verify/${reference}`,
    {
      headers: getHeaders(),
    }
  );

  return res.data.data;
};

exports.createTransferRecipient = async ({
  name,
  accountNumber,
  bankCode,
  currency = "NGN",
}) => {
  const res = await axios.post(
    `${getPaystackBaseUrl()}/transferrecipient`,
    {
      type: "nuban",
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency,
    },
    {
      headers: getHeaders(),
    }
  );

  return res.data.data;
};

exports.initiateTransfer = async ({
  amount,
  recipient,
  reason = "Wallet withdrawal",
  reference,
}) => {
  const res = await axios.post(
    `${getPaystackBaseUrl()}/transfer`,
    {
      source: "balance",
      amount: Number(amount) * 100,
      recipient,
      reason,
      reference,
    },
    {
      headers: getHeaders(),
    }
  );

  return res.data.data;
};

exports.listBanks = async () => {
  const res = await axios.get(
    `${getPaystackBaseUrl()}/bank?country=nigeria`,
    {
      headers: getHeaders(),
    }
  );

  return res.data.data;
};