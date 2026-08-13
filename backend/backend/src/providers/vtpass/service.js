const axios = require("axios");
const { getVtpassBaseUrl } = require("./utils");

const getHeaders = () => {
  if (!process.env.VTPASS_API_KEY || !process.env.VTPASS_SECRET_KEY) {
    throw new Error("VTpass credentials are missing");
  }

  return {
    "api-key": process.env.VTPASS_API_KEY,
    "secret-key": process.env.VTPASS_SECRET_KEY,
    "Content-Type": "application/json",
  };
};

exports.buyAirtime = async ({ requestId, serviceId, amount, phone }) => {
  const res = await axios.post(
    `${getVtpassBaseUrl()}/pay`,
    {
      request_id: requestId,
      serviceID: serviceId,
      amount,
      phone,
    },
    { headers: getHeaders() }
  );

  return res.data;
};

exports.buyData = async ({ requestId, serviceId, billersCode, variationCode, phone }) => {
  const res = await axios.post(
    `${getVtpassBaseUrl()}/pay`,
    {
      request_id: requestId,
      serviceID: serviceId,
      billersCode,
      variation_code: variationCode,
      phone,
    },
    { headers: getHeaders() }
  );

  return res.data;
};

exports.payBill = async ({ requestId, serviceId, billersCode, variationCode, amount, phone }) => {
  const res = await axios.post(
    `${getVtpassBaseUrl()}/pay`,
    {
      request_id: requestId,
      serviceID: serviceId,
      billersCode,
      variation_code: variationCode,
      amount,
      phone,
    },
    { headers: getHeaders() }
  );

  return res.data;
};

exports.verifyTransaction = async (requestId) => {
  const res = await axios.post(
    `${getVtpassBaseUrl()}/requery`,
    {
      request_id: requestId,
    },
    { headers: getHeaders() }
  );

  return res.data;
};

exports.getVariations = async (serviceId) => {
  const res = await axios.get(
    `${getVtpassBaseUrl()}/service-variations?serviceID=${serviceId}`,
    { headers: getHeaders() }
  );

  return res.data;
};