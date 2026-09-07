const axios = require("axios");

const API_TOKEN = process.env.SMARTSMS_API_TOKEN || "dcpd4HYbsZoiK5CHZx4M5GE8NSbETx2eAWYGCtcb7HnjLeHjy5";
const BASE_URL = "https://smartsmssolutions.com/api/json.php";

/**
 * 1. Sayen Airtime (VTU)
 */
exports.purchaseAirtime = async (phone, amount, network) => {
  try {
    const formattedPhone = String(phone).replace(/[^0-9]/g, "").slice(-10); // Lambobi 10 na karshe
    const payload = {
      token: API_TOKEN,
      service: "airtime",
      recipient: `0${formattedPhone}`,
      amount: Number(amount),
      network: network.toLowerCase(), // mtn, airtel, glo, 9mobile
    };

    const response = await axios.post(BASE_URL, payload);
    return response.data;
  } catch (error) {
    console.error("SmartSMS Airtime Error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * 2. Sayen Data Bundle
 */
exports.purchaseData = async (phone, dataPlanCode, network) => {
  try {
    const formattedPhone = String(phone).replace(/[^0-9]/g, "").slice(-10);
    const payload = {
      token: API_TOKEN,
      service: "data",
      recipient: `0${formattedPhone}`,
      plan: dataPlanCode, // Code din package din da aka zaba
      network: network.toLowerCase(),
    };

    const response = await axios.post(BASE_URL, payload);
    return response.data;
  } catch (error) {
    console.error("SmartSMS Data Error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * 3. Biyan Wutar Lantarki (Electricity Bill)
 */
exports.payElectricity = async (meterNumber, discoCode, amount, meterType = "prepaid") => {
  try {
    const payload = {
      token: API_TOKEN,
      service: "electricity",
      meter: String(meterNumber).trim(),
      disco: discoCode.toLowerCase(), // misali: kedco, eedc, ibedc, aedc
      amount: Number(amount),
      type: meterType.toLowerCase(), // prepaid ko postpaid
    };

    const response = await axios.post(BASE_URL, payload);
    return response.data;
  } catch (error) {
    console.error("SmartSMS Electricity Error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * 4. Biyan Cable TV (DSTV, GOTV, Startimes)
 */
exports.payCableTV = async (smartCardNumber, cableProvider, packageCode) => {
  try {
    const payload = {
      token: API_TOKEN,
      service: "cable_tv",
      smartcard: String(smartCardNumber).trim(),
      provider: cableProvider.toLowerCase(), // dstv, gotv, startimes
      package: packageCode,
    };

    const response = await axios.post(BASE_URL, payload);
    return response.data;
  } catch (error) {
    console.error("SmartSMS Cable Error:", error.response?.data || error.message);
    throw error;
  }
};