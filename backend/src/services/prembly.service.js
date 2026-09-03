const axios = require("axios");

const APP_ID = process.env.PREMBLY_APP_ID;
const API_KEY = process.env.PREMBLY_API_KEY;
const BASE_URL = process.env.PREMBLY_BASE_URL || "https://api.prembly.com";

const getHeaders = () => ({
  "Content-Type": "application/json",
  "app-id": APP_ID,
  "x-api-key": API_KEY,
});

/* ======================================================
   1. VERIFY NIN (NATIONAL IDENTITY NUMBER)
====================================================== */
exports.verifyNIN = async (ninNumber) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/identitypass/verification/nin`,
      { nin: String(ninNumber).trim() },
      { headers: getHeaders(), timeout: 25000 }
    );

    const data = response.data;
    const isSuccess = data?.status === true || String(data?.response_code) === "00";
    const payload = data?.data || data?.nin_data || {};

    return {
      success: isSuccess,
      nin: payload.nin || ninNumber,
      firstName: payload.firstname || payload.first_name || "",
      surname: payload.surname || payload.last_name || "",
      middleName: payload.middlename || payload.middle_name || "",
      phone: payload.telephoneno || payload.phone || "",
      gender: payload.gender || "",
      dob: payload.birthdate || payload.dob || "",
      photo: payload.photo || payload.image || null,
      address: payload.residence_address || payload.address || "",
      raw: data,
    };
  } catch (error) {
    const msg = error.response?.data?.message || error.message || "NIN verification failed";
    return { success: false, message: msg, error: error.response?.data };
  }
};

/* ======================================================
   2. VERIFY BVN (BANK VERIFICATION NUMBER)
====================================================== */
exports.verifyBVN = async (bvnNumber) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/identitypass/verification/bvn`,
      { number: String(bvnNumber).trim() },
      { headers: getHeaders(), timeout: 25000 }
    );

    const data = response.data;
    const isSuccess = data?.status === true || String(data?.response_code) === "00";
    const payload = data?.data || data?.bvn_data || {};

    return {
      success: isSuccess,
      bvn: payload.bvn || bvnNumber,
      firstName: payload.firstname || payload.first_name || "",
      surname: payload.surname || payload.last_name || "",
      middleName: payload.middlename || payload.middle_name || "",
      phone: payload.phoneNumber || payload.phone || "",
      gender: payload.gender || "",
      dob: payload.dateOfBirth || payload.dob || "",
      photo: payload.image || payload.photo || null,
      raw: data,
    };
  } catch (error) {
    const msg = error.response?.data?.message || error.message || "BVN verification failed";
    return { success: false, message: msg, error: error.response?.data };
  }
};

/* ======================================================
   3. NIN VALIDATION / ISSUE RESOLUTION (NIMC CLEARANCE)
====================================================== */
exports.validateNINIssue = async ({ nin, issueType, reference }) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/identitypass/verification/nin/validation`,
      {
        nin: String(nin).trim(),
        issue_type: issueType || "BANK_MISMATCH",
        reference: reference || `VAL_${Date.now()}`,
      },
      { headers: getHeaders(), timeout: 35000 }
    );

    const data = response.data;
    const isSuccess = data?.status === true || String(data?.response_code) === "00";

    return {
      success: isSuccess,
      nin,
      issueType,
      trackingId: data?.tracking_id || data?.reference || reference,
      message: data?.message || "NIN validation submitted successfully",
      raw: data,
    };
  } catch (error) {
    const msg = error.response?.data?.message || error.message || "NIN validation submission failed";
    return { success: false, message: msg, error: error.response?.data };
  }
};