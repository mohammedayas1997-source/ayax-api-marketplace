const axios = require("axios");

const API_KEY = process.env.ABJIKTECH_API_KEY;
const BASE_URL = (process.env.ABJIKTECH_BASE_URL || "https://abjiktech.com.ng").replace(/\/+$/, "");

const ENDPOINTS = {
  // NIN by NIN
  NIN_PREMIUM: `${BASE_URL}/api/verification/nin_by_nin.php`,
  NIN_STANDARD: `${BASE_URL}/api/verification/nin_standard_slip.php`,
  NIN_REGULAR: `${BASE_URL}/api/verification/nin_regular_slip.php`,
  NIN_VNIN: `${BASE_URL}/api/verification/vnin_slip.php`,

  // NIN by Phone
  PHONE_PREMIUM: `${BASE_URL}/api/verification/nin_by_phone_premium.php`,
  PHONE_STANDARD: `${BASE_URL}/api/verification/nin_by_phone_standard.php`,
  PHONE_REGULAR: `${BASE_URL}/api/verification/nin_by_phone_regular.php`,

  // BVN
  BVN_PREMIUM: `${BASE_URL}/api/verification/bvn_premium_slip.php`,
  BVN_STANDARD: `${BASE_URL}/api/verification/bvn_full_details_slip.php`,

  // NIN Validation
  VALIDATION_SUBMIT: `${BASE_URL}/api/verification/validation.php`,
  VALIDATION_STATUS: `${BASE_URL}/api/verification/validation_status.php`,

  // IPE Clearance
  IPE_SUBMIT: `${BASE_URL}/api/verification/ipe_clearance.php`,
  IPE_STATUS: `${BASE_URL}/api/verification/get_status.php`,

  // Personalization
  PERSONALIZATION_SUBMIT: `${BASE_URL}/api/verification/personalization.php`,
  PERSONALIZATION_STATUS: `${BASE_URL}/api/verification/personalization_status.php`,
};

/* ======================================================
   1. NIN VERIFICATION (BY NIN)
====================================================== */
exports.verifyNIN = async (ninNumber, slipType = "Standard Slip") => {
  try {
    const formatted = String(slipType).toUpperCase();
    let url = ENDPOINTS.NIN_STANDARD;
    if (formatted.includes("PREMIUM")) url = ENDPOINTS.NIN_PREMIUM;
    else if (formatted.includes("REGULAR")) url = ENDPOINTS.NIN_REGULAR;
    else if (formatted.includes("VNIN")) url = ENDPOINTS.NIN_VNIN;

    const res = await axios.post(url, { api_key: API_KEY, nin: String(ninNumber).trim() }, { timeout: 35000 });
    const d = res.data;
    const ok = d?.success === true || d?.status === "success" || d?.status === true;
    const r = d?.data || d?.result || d;

    return {
      success: ok,
      nin: r?.nin || ninNumber,
      firstName: r?.firstname || r?.first_name || "",
      surname: r?.surname || r?.last_name || "",
      middleName: r?.middlename || r?.middle_name || "",
      phone: r?.telephoneno || r?.phone || r?.phoneNumber || "",
      gender: r?.gender || "",
      dob: r?.birthdate || r?.dob || "",
      photo: r?.photo || r?.image || null,
      address: r?.residence_address || r?.address || "",
      trackingId: r?.trackingId || r?.tracking_id || null,
      slipUrl: r?.slip_url || r?.pdf_url || null,
      message: d?.message || "NIN verification completed",
      raw: d,
    };
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
};

/* ======================================================
   2. NIN VERIFICATION (BY PHONE)
====================================================== */
exports.verifyNINByPhone = async (phone, slipType = "Standard Slip") => {
  try {
    const formatted = String(slipType).toUpperCase();
    let url = ENDPOINTS.PHONE_STANDARD;
    if (formatted.includes("PREMIUM")) url = ENDPOINTS.PHONE_PREMIUM;
    else if (formatted.includes("REGULAR")) url = ENDPOINTS.PHONE_REGULAR;
    else if (formatted.includes("VNIN")) url = ENDPOINTS.NIN_VNIN;

    const res = await axios.post(url, { api_key: API_KEY, phone: String(phone).trim() }, { timeout: 35000 });
    const d = res.data;
    const ok = d?.success === true || d?.status === "success" || d?.status === true;
    const r = d?.data || d?.result || d;

    return {
      success: ok,
      nin: r?.nin || "",
      phone: r?.telephoneno || r?.phone || phone,
      firstName: r?.firstname || r?.first_name || "",
      surname: r?.surname || r?.last_name || "",
      middleName: r?.middlename || r?.middle_name || "",
      gender: r?.gender || "",
      dob: r?.birthdate || r?.dob || "",
      photo: r?.photo || r?.image || null,
      address: r?.residence_address || r?.address || "",
      slipUrl: r?.slip_url || r?.pdf_url || null,
      message: d?.message || "NIN lookup by phone completed",
      raw: d,
    };
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
};

/* ======================================================
   3. BVN VERIFICATION
====================================================== */
exports.verifyBVN = async (bvnNumber, slipType = "Standard Slip") => {
  try {
    const url = String(slipType).toUpperCase().includes("PREMIUM")
      ? ENDPOINTS.BVN_PREMIUM
      : ENDPOINTS.BVN_STANDARD;

    const res = await axios.post(url, { api_key: API_KEY, bvn: String(bvnNumber).trim() }, { timeout: 35000 });
    const d = res.data;
    const ok = d?.success === true || d?.status === "success" || d?.status === true;
    const r = d?.data || d?.result || d;

    return {
      success: ok,
      bvn: r?.bvn || bvnNumber,
      firstName: r?.firstname || r?.first_name || "",
      surname: r?.surname || r?.last_name || "",
      middleName: r?.middlename || r?.middle_name || "",
      phone: r?.phoneNumber || r?.phone || "",
      gender: r?.gender || "",
      dob: r?.dateOfBirth || r?.dob || "",
      photo: r?.image || r?.photo || null,
      slipUrl: r?.slip_url || r?.pdf_url || null,
      message: d?.message || "BVN verification completed",
      raw: d,
    };
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
};

/* ======================================================
   4. NIN VALIDATION (SUBMISSION & STATUS)
====================================================== */
exports.submitNinValidation = async ({ nin, errorType }) => {
  try {
    const res = await axios.post(
      ENDPOINTS.VALIDATION_SUBMIT,
      {
        api_key: API_KEY,
        nin: String(nin).trim(),
        error_type: errorType, // no_record, simbank_validation, modification, photo_error
      },
      { timeout: 35000 }
    );
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
};

exports.checkNinValidationStatus = async ({ ticketId, transactionId }) => {
  try {
    const payload = { api_key: API_KEY };
    if (ticketId) payload.ticket_id = ticketId;
    if (transactionId) payload.transaction_id = transactionId;

    const res = await axios.post(ENDPOINTS.VALIDATION_STATUS, payload, { timeout: 25000 });
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
};

/* ======================================================
   5. IPE CLEARANCE (SUBMISSION & STATUS)
====================================================== */
exports.submitIpeClearance = async (trackingID) => {
  try {
    const res = await axios.post(
      ENDPOINTS.IPE_SUBMIT,
      { api_key: API_KEY, trackingID: String(trackingID).trim() },
      { timeout: 35000 }
    );
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
};

exports.checkIpeStatus = async (trackingID) => {
  try {
    const res = await axios.post(
      ENDPOINTS.IPE_STATUS,
      { api_key: API_KEY, trackingID: String(trackingID).trim() },
      { timeout: 25000 }
    );
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
};

/* ======================================================
   6. NIN PERSONALIZATION (SUBMISSION & STATUS)
====================================================== */
exports.submitPersonalization = async (trackingId) => {
  try {
    const res = await axios.post(
      ENDPOINTS.PERSONALIZATION_SUBMIT,
      { api_key: API_KEY, tracking_id: String(trackingId).trim() },
      { timeout: 35000 }
    );
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
};

exports.checkPersonalizationStatus = async (trackingId) => {
  try {
    const res = await axios.post(
      ENDPOINTS.PERSONALIZATION_STATUS,
      { api_key: API_KEY, tracking_id: String(trackingId).trim() },
      { timeout: 25000 }
    );
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
};