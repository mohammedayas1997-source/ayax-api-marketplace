const axios = require("axios");

const BASE_URL = "https://smartsmssolutions.com/api/json.php";
const API_TOKEN = process.env.SMARTSMS_API_TOKEN;

/**
 * 1. SAYEN AIRTIME
 */
exports.vendAirtime = async ({ network, phone, amount, reference }) => {
  try {
    const networkMap = {
      MTN: "1",
      AIRTEL: "2",
      GLO: "3",
      "9MOBILE": "4",
    };

    const response = await axios.post(
      BASE_URL,
      {
        token: API_TOKEN,
        type: "airtime",
        network: networkMap[network.toUpperCase()] || "1",
        phone,
        amount: Number(amount),
        ref: reference,
      },
      { timeout: 30000 }
    );

    const data = response.data;

    // SmartSMS yana mayar da code 1000 ko status "success"
    if (data.code === "1000" || data.status === "successful" || data.status === "success") {
      return {
        success: true,
        reference: data.ref || reference,
        raw: data,
      };
    }

    return {
      success: false,
      message: data.message || data.error || "Airtime purchase failed",
      raw: data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

/**
 * 2. TABBATAR DA SUNAN MAI MITA / DECODER (VERIFICATION)
 */
exports.verifyBill = async ({ serviceType, accountId, discoOrProvider }) => {
  try {
    // serviceType: "electricity" ko "cable"
    const response = await axios.post(
      BASE_URL,
      {
        token: API_TOKEN,
        type: "verify",
        service: serviceType, // 'electricity' | 'cable'
        account: accountId,   // Meter number ko Smartcard/IUC
        provider: discoOrProvider, // misali: 'ikeja-electric', 'dstv', 'gotv'
      },
      { timeout: 25000 }
    );

    if (response.data?.code === "1000" || response.data?.status === "success") {
      return {
        success: true,
        customerName: response.data.customer_name || response.data.name,
        address: response.data.address || "",
      };
    }

    return { success: false, message: response.data?.message || "Verification failed" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * 3. BIYAN WUTAR LANTARKI (ELECTRICITY TOKEN)
 */
exports.payElectricity = async ({ disco, meterNumber, meterType, amount, phone, reference }) => {
  try {
    const response = await axios.post(
      BASE_URL,
      {
        token: API_TOKEN,
        type: "electricity",
        disco: disco.toLowerCase(), // misali: 'eko-electric', 'ibadan-electric', 'kano-electric'
        meter: meterNumber,
        meter_type: meterType.toLowerCase(), // 'prepaid' ko 'postpaid'
        amount: Number(amount),
        phone,
        ref: reference,
      },
      { timeout: 45000 }
    );

    const data = response.data;
    if (data.code === "1000" || data.status === "success") {
      return {
        success: true,
        reference: data.ref || reference,
        token: data.token || data.meter_token, // Wannan shine Token din da mutum zai saka a mita
        units: data.units || "",
        amount: data.amount,
      };
    }

    return {
      success: false,
      message: data.message || "Electricity purchase failed",
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * 4. BIYAN CABLE TV (DSTV, GOTV, STARTIMES)
 */
exports.payCableTv = async ({ provider, smartcardNumber, packageCode, amount, phone, reference }) => {
  try {
    const response = await axios.post(
      BASE_URL,
      {
        token: API_TOKEN,
        type: "cable",
        provider: provider.toLowerCase(), // 'dstv', 'gotv', 'startimes'
        smartcard: smartcardNumber,
        package: packageCode,
        amount: Number(amount),
        phone,
        ref: reference,
      },
      { timeout: 45000 }
    );

    const data = response.data;
    if (data.code === "1000" || data.status === "success") {
      return {
        success: true,
        reference: data.ref || reference,
        message: "Subscription activated successfully",
      };
    }

    return {
      success: false,
      message: data.message || "Cable activation failed",
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};