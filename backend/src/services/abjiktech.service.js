const axios = require("axios");

const API_KEY = process.env.ABJIKTECH_API_KEY;
const BASE_URL = (process.env.ABJIKTECH_BASE_URL || "https://abjiktech.com.ng/api").replace(/\/+$/, "");

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
  "api-key": API_KEY,
});

/* ======================================================
   1. NIN VERIFICATION (SLIP & PHOTO LOOKUP)
====================================================== */
exports.verifyNIN = async (ninNumber) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/nin/verify`,
      { nin: String(ninNumber).trim() },
      { headers: getHeaders(), timeout: 30000 }
    );

    const data = response.data;
    const isSuccess = data?.status === "success" || data?.status === true || String(data?.code) === "200";
    const payload = data?.data || data?.result || {};

    return {
      success: isSuccess,
      nin: payload.nin || ninNumber,
      firstName: payload.firstname || payload.first_name || "",
      surname: payload.surname || payload.last_name || "",
      middleName: payload.middlename || payload.middle_name || "",
      phone: payload.telephoneno || payload.phone || payload.phoneNumber || "",
      gender: payload.gender || "",
      dob: payload.birthdate || payload.dob || "",
      photo: payload.photo || payload.image || null,
      address: payload.residence_address || payload.address || "",
      raw: data,
    };
  } catch (error) {
    const msg = error.response?.data?.message || error.message || "Abjiktech NIN verification failed";
    return { success: false, message: msg, error: error.response?.data };
  }
};

/* ======================================================
   2. BVN VERIFICATION
====================================================== */
exports.verifyBVN = async (bvnNumber) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/bvn/verify`,
      { bvn: String(bvnNumber).trim() },
      { headers: getHeaders(), timeout: 30000 }
    );

    const data = response.data;
    const isSuccess = data?.status === "success" || data?.status === true || String(data?.code) === "200";
    const payload = data?.data || data?.result || {};

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
    const msg = error.response?.data?.message || error.message || "Abjiktech BVN verification failed";
    return { success: false, message: msg, error: error.response?.data };
  }
};

/* ======================================================
   3. NIN VALIDATION / ISSUE RESOLUTION (IPE CLEARANCE)
====================================================== */
exports.validateNINIssue = async ({ nin, issueType, reference }) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/nin/validate`,
      {
        nin: String(nin).trim(),
        issue_type: issueType || "BANK_MISMATCH",
        reference: reference || `VAL_${Date.now()}`,
      },
      { headers: getHeaders(), timeout: 45000 }
    );

    const data = response.data;
    const isSuccess = data?.status === "success" || data?.status === true || String(data?.code) === "200";

    return {
      success: isSuccess,
      nin,
      issueType,
      trackingId: data?.tracking_id || data?.reference || reference,
      message: data?.message || "NIN validation submitted successfully to NIMC via Abjiktech",
      raw: data,
    };
  } catch (error) {
    const msg = error.response?.data?.message || error.message || "Abjiktech NIN validation submission failed";
    return { success: false, message: msg, error: error.response?.data };
  }
};