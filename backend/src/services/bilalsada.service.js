const axios = require("axios");

const BASE_URL = "https://bilalsadasub.com/api";
const API_TOKEN = process.env.BILALSADA_API_TOKEN;

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Token ${API_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/**
 * 1. AIRTIME (VTU / Share & Sell)
 */
exports.vendAirtime = async ({ network, phone, amount, reference, planType = "VTU" }) => {
  try {
    const networkMap = { MTN: 1, GLO: 2, "9MOBILE": 3, AIRTEL: 4 };
    const netId = networkMap[String(network).toUpperCase()] || 1;

    const response = await client.post("/topup", {
      network: netId,
      phone,
      amount: Number(amount),
      plan_type: planType,
      "request-id": reference || `BILAL_AIR_${Date.now()}`,
    });

    const data = response.data;
    const isSuccess = data.status === "success" || data.status === "process";

    return {
      success: isSuccess,
      reference: data["request-id"] || reference,
      message: data.message,
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

/**
 * 2. CABLE TV SUBSCRIPTION (DSTV, GOTV, STARTIMES)
 */
exports.vendCable = async ({ cableId, smartCardNumber, planId, reference }) => {
  try {
    const response = await client.post("/cablesub", {
      cable: Number(cableId),
      smart_card_number: String(smartCardNumber),
      plan: Number(planId),
      "request-id": reference || `BILAL_CAB_${Date.now()}`,
    });

    const data = response.data;
    return {
      success: data.status === "success" || data.status === "process",
      reference: data["request-id"] || reference,
      message: data.message,
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

/**
 * 3. ELECTRICITY BILL (PREPAID / POSTPAID)
 */
exports.vendElectricity = async ({ discoId, meterNumber, amount, meterType = "prepaid", reference }) => {
  try {
    const response = await client.post("/billpayment", {
      disco: Number(discoId),
      meter_number: String(meterNumber),
      meter_type: meterType.toLowerCase(),
      amount: Number(amount),
      "request-id": reference || `BILAL_ELEC_${Date.now()}`,
    });

    const data = response.data;
    return {
      success: data.status === "success" || data.status === "process",
      token: data.token || data.purchased_code || null,
      units: data.units || null,
      reference: data["request-id"] || reference,
      message: data.message,
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};