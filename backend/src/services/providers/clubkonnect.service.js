const axios = require("axios");

const CLUBKONNECT_BASE_URL = "https://www.clubkonnect.com/API";
const USER_ID = process.env.CLUBKONNECT_USER_ID;
const API_KEY = process.env.CLUBKONNECT_API_KEY;

/* ======================================================
   CABLE TV API
====================================================== */

// 1. Tabbatar da Sunan Mai SmartCard (IUC/Card Validation)
exports.verifyCable = async ({ cableTv, smartCardNo }) => {
  try {
    const url = `${CLUBKONNECT_BASE_URL}/VerifyCableTV.asp?UserID=${USER_ID}&APIKey=${API_KEY}&cabletv=${cableTv.toLowerCase()}&smartcardno=${smartCardNo}`;
    const response = await axios.get(url);

    if (response.data?.customer_name) {
      return {
        success: true,
        customerName: response.data.customer_name,
        customerNumber: response.data.customer_number || smartCardNo,
        status: response.data.status,
      };
    }

    throw new Error(response.data?.message || "Invalid SmartCard / IUC Number");
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || "Failed to verify SmartCard");
  }
};

// 2. Biyan Kuɗin Cable TV
exports.buyCable = async ({ cableTv, packageCode, smartCardNo, phone, reference }) => {
  try {
    const url = `${CLUBKONNECT_BASE_URL}/CableTV.asp?UserID=${USER_ID}&APIKey=${API_KEY}&cabletv=${cableTv.toLowerCase()}&package=${packageCode}&smartcardno=${smartCardNo}&phone=${phone}&orderid=${reference}`;
    const response = await axios.get(url);

    if (response.data?.status === "ORDER_RECEIVED" || response.data?.status === "SUCCESS") {
      return {
        success: true,
        orderId: response.data.orderid || reference,
        status: "SUCCESSFUL",
        raw: response.data,
      };
    }

    throw new Error(response.data?.msg || response.data?.message || "Clubkonnect cable subscription failed");
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || "Cable purchase failed via provider");
  }
};

/* ======================================================
   ELECTRICITY BILLS API
====================================================== */

// 1. Tabbatar da Meter Number
exports.verifyMeter = async ({ disco, meterNo, meterType }) => {
  try {
    const url = `${CLUBKONNECT_BASE_URL}/VerifyMeter.asp?UserID=${USER_ID}&APIKey=${API_KEY}&disco=${disco.toLowerCase()}&meterno=${meterNo}&metertype=${meterType.toLowerCase()}`;
    const response = await axios.get(url);

    if (response.data?.customer_name) {
      return {
        success: true,
        customerName: response.data.customer_name,
        customerAddress: response.data.customer_address || "",
        meterNo: response.data.meter_no || meterNo,
      };
    }

    throw new Error(response.data?.message || "Invalid Meter Number");
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || "Failed to verify Meter number");
  }
};

// 2. Sayen Token / Biyan Kuɗin Wuta
exports.buyElectricity = async ({ disco, meterNo, meterType, amount, phone, reference }) => {
  try {
    const url = `${CLUBKONNECT_BASE_URL}/BillPayment.asp?UserID=${USER_ID}&APIKey=${API_KEY}&disco=${disco.toLowerCase()}&meterno=${meterNo}&metertype=${meterType.toLowerCase()}&amount=${amount}&phone=${phone}&orderid=${reference}`;
    const response = await axios.get(url);

    if (response.data?.status === "ORDER_RECEIVED" || response.data?.status === "SUCCESS") {
      return {
        success: true,
        orderId: response.data.orderid || reference,
        token: response.data.token || response.data.metertoken || null,
        units: response.data.units || null,
        status: "SUCCESSFUL",
        raw: response.data,
      };
    }

    throw new Error(response.data?.msg || response.data?.message || "Clubkonnect bill payment failed");
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || "Electricity purchase failed via provider");
  }
};