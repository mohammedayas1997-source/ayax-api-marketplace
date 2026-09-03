const axios = require("axios");

const USER_ID = process.env.CLUBKONNECT_USER_ID;
const API_KEY = process.env.CLUBKONNECT_API_KEY;
const BASE_URL = process.env.CLUBKONNECT_BASE_URL || "https://www.clubkonnect.com/API";

// Network Codes
const NETWORK_CODES = {
  MTN: "01",
  GLO: "02",
  "9MOBILE": "03",
  AIRTEL: "04",
};

// Cable TV Codes
const CABLE_CODES = {
  DSTV: "01",
  GOTV: "02",
  STARTIMES: "03",
};

// Dukkan DISCOs 12 na Najeriya
const DISCO_CODES = {
  IKEDC: "01",   // Ikeja Electric
  EKEDC: "02",   // Eko Electricity
  AEDC: "03",    // Abuja Electricity
  KEDCO: "04",   // Kano Electricity
  PHED: "05",    // Port Harcourt Electricity
  JED: "06",     // Jos Electricity
  IBEDC: "07",   // Ibadan Electricity
  KAEDCO: "08",  // Kaduna Electricity
  EEDC: "09",    // Enugu Electricity
  BEDC: "10",    // Benin Electricity
  YEDC: "11",    // Yola Electricity
  ABA: "12",     // Aba Power Electric
};

/* ======================================================
   AIRTIME VENDING
====================================================== */
exports.vendAirtime = async ({ network, phone, amount, reference }) => {
  const netCode = NETWORK_CODES[String(network).toUpperCase()] || "01";
  const url = `${BASE_URL}/AirTimeAPI.asp?UserID=${USER_ID}&APIKey=${API_KEY}&MobileNetwork=${netCode}&Amount=${amount}&MobileNumber=${phone}&RequestID=${reference}`;

  const response = await axios.get(url, { timeout: 30000 });
  const data = response.data;

  const isSuccess =
    String(data?.status || "").toUpperCase().includes("ORDER_RECEIVED") ||
    String(data?.statuscode) === "100" ||
    String(data?.statuscode) === "200";

  return {
    success: isSuccess,
    rawResponse: data,
    orderId: data?.orderid || data?.RequestID || reference,
  };
};

/* ======================================================
   DATA BUNDLE VENDING
====================================================== */
exports.vendData = async ({ network, phone, planCode, reference }) => {
  const netCode = NETWORK_CODES[String(network).toUpperCase()] || "01";
  const url = `${BASE_URL}/DataBundleAPI.asp?UserID=${USER_ID}&APIKey=${API_KEY}&MobileNetwork=${netCode}&DataPlan=${planCode}&MobileNumber=${phone}&RequestID=${reference}`;

  const response = await axios.get(url, { timeout: 35000 });
  const data = response.data;

  const isSuccess =
    String(data?.status || "").toUpperCase().includes("ORDER_RECEIVED") ||
    String(data?.statuscode) === "100" ||
    String(data?.statuscode) === "200";

  return {
    success: isSuccess,
    rawResponse: data,
    orderId: data?.orderid || data?.RequestID || reference,
  };
};

/* ======================================================
   CABLE TV FUNCTIONS
====================================================== */
exports.verifyCableIUC = async ({ service, smartCardNo }) => {
  const cableCode = CABLE_CODES[String(service).toUpperCase()] || "02";
  const url = `${BASE_URL}/VerifyCard.asp?UserID=${USER_ID}&APIKey=${API_KEY}&CableTV=${cableCode}&SmartCardNo=${smartCardNo}`;

  const response = await axios.get(url, { timeout: 20000 });
  const data = response.data;

  const isValid = data?.customer_name || data?.Customer_Name || data?.name;
  return {
    success: Boolean(isValid),
    customerName: data?.customer_name || data?.Customer_Name || data?.name || "Verified Customer",
    rawResponse: data,
  };
};

exports.vendCableTV = async ({ service, smartCardNo, packageCode, phone, reference }) => {
  const cableCode = CABLE_CODES[String(service).toUpperCase()] || "02";
  const url = `${BASE_URL}/CableTV.asp?UserID=${USER_ID}&APIKey=${API_KEY}&CableTV=${cableCode}&Package=${packageCode}&SmartCardNo=${smartCardNo}&PhoneNo=${phone || "08000000000"}&RequestID=${reference}`;

  const response = await axios.get(url, { timeout: 35000 });
  const data = response.data;

  const isSuccess =
    String(data?.status || "").toUpperCase().includes("ORDER_RECEIVED") ||
    String(data?.statuscode) === "100" ||
    String(data?.statuscode) === "200";

  return {
    success: isSuccess,
    rawResponse: data,
    orderId: data?.orderid || data?.RequestID || reference,
  };
};

/* ======================================================
   ELECTRICITY BILL (ALL 12 NIGERIA DISCOS)
====================================================== */
exports.verifyMeter = async ({ disco, meterNo, meterType }) => {
  const discoCode = DISCO_CODES[String(disco).toUpperCase()] || "01";
  const mType = String(meterType).toUpperCase() === "POSTPAID" ? "02" : "01";

  const url = `${BASE_URL}/VerifyMeter.asp?UserID=${USER_ID}&APIKey=${API_KEY}&ElectricCompany=${discoCode}&MeterNo=${meterNo}&MeterType=${mType}`;

  const response = await axios.get(url, { timeout: 20000 });
  const data = response.data;

  const isValid = data?.customer_name || data?.Customer_Name || data?.name;
  return {
    success: Boolean(isValid),
    customerName: data?.customer_name || data?.Customer_Name || data?.name || "Verified Customer",
    address: data?.address || data?.Address || "",
    rawResponse: data,
  };
};

exports.vendElectricity = async ({ disco, meterNo, meterType, amount, phone, reference }) => {
  const discoCode = DISCO_CODES[String(disco).toUpperCase()] || "01";
  const mType = String(meterType).toUpperCase() === "POSTPAID" ? "02" : "01";

  const url = `${BASE_URL}/PayBill.asp?UserID=${USER_ID}&APIKey=${API_KEY}&ElectricCompany=${discoCode}&MeterType=${mType}&MeterNo=${meterNo}&Amount=${amount}&PhoneNo=${phone || "08000000000"}&RequestID=${reference}`;

  const response = await axios.get(url, { timeout: 40000 });
  const data = response.data;

  const isSuccess =
    String(data?.status || "").toUpperCase().includes("ORDER_RECEIVED") ||
    String(data?.statuscode) === "100" ||
    String(data?.statuscode) === "200";

  return {
    success: isSuccess,
    token: data?.token || data?.MeterToken || data?.Pin || null,
    units: data?.units || null,
    rawResponse: data,
    orderId: data?.orderid || data?.RequestID || reference,
  };
};