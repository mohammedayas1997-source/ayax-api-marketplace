const axios = require("axios");
const { getFlutterwaveBaseUrl } = require("./utils");

const getHeaders = () => {
  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    throw new Error("Flutterwave secret key is missing");
  }

  return {
    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
};

exports.initializeTransaction = async ({
  amount,
  email,
  name,
  phone,
  reference,
  redirectUrl,
  metadata = {},
}) => {
  const res = await axios.post(
    `${getFlutterwaveBaseUrl()}/payments`,
    {
      tx_ref: reference,
      amount,
      currency: "NGN",
      redirect_url: redirectUrl,
      customer: {
        email,
        name,
        phonenumber: phone,
      },
      customizations: {
        title: "Ayax API Marketplace",
        description: "Wallet Funding",
      },
      meta: metadata,
    },
    {
      headers: getHeaders(),
    }
  );

  return res.data.data;
};

exports.verifyTransaction = async (transactionId) => {
  const res = await axios.get(
    `${getFlutterwaveBaseUrl()}/transactions/${transactionId}/verify`,
    {
      headers: getHeaders(),
    }
  );

  return res.data.data;
};

exports.createTransfer = async ({
  amount,
  accountBank,
  accountNumber,
  narration = "Wallet withdrawal",
  reference,
  beneficiaryName,
}) => {
  const res = await axios.post(
    `${getFlutterwaveBaseUrl()}/transfers`,
    {
      account_bank: accountBank,
      account_number: accountNumber,
      amount,
      narration,
      currency: "NGN",
      reference,
      beneficiary_name: beneficiaryName,
    },
    {
      headers: getHeaders(),
    }
  );

  return res.data.data;
};

exports.listBanks = async () => {
  const res = await axios.get(`${getFlutterwaveBaseUrl()}/banks/NG`, {
    headers: getHeaders(),
  });

  return res.data.data;
};