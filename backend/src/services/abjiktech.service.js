const axios = require("axios");

// Tabbatar da Base URL ko da an saka empty string ko an ƙara /api a Render
let rawBase = (process.env.ABJIKTECH_BASE_URL || "").trim();
if (!rawBase || !rawBase.startsWith("http")) {
  rawBase = "https://abjiktech.com.ng";
}
const BASE_URL = rawBase.replace(/\/+$/, "").replace(/\/api$/, "");

const API_KEY = (process.env.ABJIKTECH_API_KEY || "dv_068de722a84b71ce900a65fa4c17bdf9_1788498653")
  .trim()
  .replace(/^["']|["']$/g, "");

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

  // BVN by BVN
  BVN_PREMIUM: `${BASE_URL}/api/verification/bvn_premium_slip.php`,
  BVN_STANDARD: `${BASE_URL}/api/verification/bvn_full_details_slip.php`,

  // BVN by Phone
  BVN_PHONE: `${BASE_URL}/api/verification/bvn_by_phone.php`,

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

    const apiKeyToUse = API_KEY || process.env.ABJIKTECH_API_KEY || "dv_068de722a84b71ce900a65fa4c17bdf9_1788498653";

    console.log(`[ABJIKTECH REQUEST]: Posting to ${url} with NIN: ${ninNumber}`);

    const res = await axios.post(
      url,
      { api_key: apiKeyToUse, nin: String(ninNumber).trim() },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 35000,
      }
    );

    const d = res.data;
    const ok = d?.status === "success" || d?.success === true;
    const r = d?.user_data || d?.data?.details || d?.data || d?.result || {};

    if (!ok && d?.success === false) {
      return {
        success: false,
        message: d?.message || "NIN verification failed at provider",
        raw: d,
      };
    }

    return {
      success: true,
      nin: r?.nin || ninNumber,
      firstName: r?.firstName || r?.firstname || r?.first_name || "",
      surname: r?.surname || r?.last_name || "",
      middleName: r?.middleName || r?.middlename || r?.middle_name || "",
      phone: r?.telephoneNo || r?.phone || r?.phoneNumber || "",
      gender: r?.gender || "",
      dob: r?.birthDate || r?.dob || r?.birthdate || "",
      photo: r?.photo || r?.image || null,
      address: r?.residence_address || r?.address || "",
      slipUrl: d?.pdf_url || d?.slip_url || r?.slip_url || r?.pdf_url || null,
      transactionId: d?.transaction_id || null,
      message: d?.message || "NIN verification completed successfully",
      raw: d,
    };
  } catch (err) {
    console.error("[ABJIKTECH ERROR]:", err.response?.data || err.message);
    return {
      success: false,
      message: err.response?.data?.message || err.message,
    };
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
    const r = d?.user_data || d?.data?.details || d?.data || d?.result || d;

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
      slipUrl: r?.slip_url || r?.pdf_url || d?.pdf_url || null,
      message: d?.message || "NIN lookup by phone completed",
      raw: d,
    };
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
};

/* ======================================================
   3. BVN VERIFICATION (BY BVN NUMBER)
====================================================== */
exports.verifyBVN = async (bvnNumber, slipType = "Standard Slip") => {
  try {
    const url = String(slipType).toUpperCase().includes("PREMIUM")
      ? ENDPOINTS.BVN_PREMIUM
      : ENDPOINTS.BVN_STANDARD;

    const res = await axios.post(
      url,
      { api_key: API_KEY, bvn: String(bvnNumber).trim() },
      { timeout: 45000 }
    );

    const d = res.data;
    const ok = d?.status === "success" || d?.success === true;
    const r = d?.user_data || d?.data?.details || d?.data || {};

    // Ciro direct PDF link na asali da Abjiktech ya samar
    const officialPdfUrl =
      d?.pdf_url ||
      d?.slip_url ||
      d?.download_url ||
      r?.pdf_url ||
      r?.slip_url ||
      null;

    return {
      success: ok,
      bvn: r?.bvn || bvnNumber,
      fullName: r?.fullName || r?.name || `${r?.firstname || r?.first_name || ""} ${r?.surname || r?.last_name || ""}`.trim() || "Verified Citizen",
      firstName: r?.firstname || r?.first_name || "",
      surname: r?.surname || r?.last_name || "",
      middleName: r?.middlename || r?.middle_name || "",
      phone: r?.phone || r?.phoneNumber || r?.telephoneNo || "",
      dob: r?.dob || r?.dateOfBirth || r?.birthdate || "",
      address: r?.address || r?.residentialAddress || r?.residence_address || "",
      bank: r?.bank || r?.enrollmentBank || "COMMERCIAL BANK",
      branch: r?.branch || r?.enrollmentBranch || "YOLA",
      photo: r?.photo || r?.image || null,
      slipUrl: officialPdfUrl,
      pdfUrl: officialPdfUrl,
      raw: d,
    };
  } catch (err) {
    console.error("[ABJIKTECH BVN ERROR]:", err.response?.data || err.message);
    return { success: false, message: err.response?.data?.message || err.message };
  }
};

/* ======================================================
   3B. BVN VERIFICATION (BY PHONE NUMBER)
====================================================== */
exports.verifyBVNByPhone = async (phone, slipType = "Standard Slip") => {
  try {
    const cleanPhone = String(phone).replace(/\D/g, "").trim();
    console.log(`[ABJIKTECH BVN PHONE REQUEST]: Posting with Phone: ${cleanPhone}`);

    // Binciko BVN ta lambar waya a Abjiktech
    let res;
    try {
      res = await axios.post(
        ENDPOINTS.BVN_PHONE,
        { api_key: API_KEY, phone: cleanPhone },
        { timeout: 45000 }
      );
    } catch (e) {
      // Idan babu bvn_by_phone.php, gwada direct full details da lambar
      res = await axios.post(
        ENDPOINTS.BVN_STANDARD,
        { api_key: API_KEY, bvn: cleanPhone, phone: cleanPhone },
        { timeout: 45000 }
      );
    }

    const d = res.data;
    const ok = d?.success === true || d?.status === "success" || d?.status === true;
    const r = d?.user_data || d?.data?.details || d?.data?.bvnDetails || d?.data || d?.result || d;

    if (!ok && d?.success === false) {
      return {
        success: false,
        message: d?.message || "No BVN found linked to this phone number",
        raw: d,
      };
    }

    const discoveredBvn = r?.bvn || r?.bvnNumber || "";
    
    // Idan an samu BVN kawai babu cikakkun bayanai, sake kiran full verification
    if (discoveredBvn && (!r?.image && !r?.photo && !r?.firstname)) {
      return await exports.verifyBVN(discoveredBvn, slipType);
    }

    const firstName = r?.firstname || r?.first_name || r?.firstName || "";
    const middleName = r?.middlename || r?.middle_name || r?.middleName || "";
    const surname = r?.surname || r?.last_name || r?.lastName || "";
    const fullName = r?.fullName || r?.name || `${firstName} ${middleName} ${surname}`.replace(/\s+/g, " ").trim();

    return {
      success: ok,
      bvn: discoveredBvn,
      fullName: fullName || "VERIFIED CUSTOMER",
      firstName,
      surname,
      middleName,
      phone: cleanPhone,
      gender: (r?.gender || "").toUpperCase(),
      dob: r?.dateOfBirth || r?.dob || r?.date_of_birth || "",
      address: r?.residentialAddress || r?.residential_address || r?.address || "",
      bank: r?.enrollmentBank || r?.enrollment_bank || r?.bank || "COMMERCIAL BANK",
      branch: r?.enrollmentBranch || r?.branch || "HEAD OFFICE",
      nin: r?.nin || "",
      photo: r?.image || r?.photo || r?.passport || null,
      slipUrl: d?.pdf_url || d?.slip_url || r?.slip_url || r?.pdf_url || null,
      message: d?.message || "BVN retrieved by phone successfully",
      raw: d,
    };
  } catch (err) {
    console.error("[ABJIKTECH BVN PHONE ERROR]:", err.response?.data || err.message);
    return {
      success: false,
      message: err.response?.data?.message || err.message,
    };
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
        error_type: errorType,
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