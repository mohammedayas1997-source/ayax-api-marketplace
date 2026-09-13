const axios = require('axios');

const BASE_URL = process.env.ALIHSAN_BASE_URL || 'https://alihsandatasub.com.ng/api/v1';
const AUTH_TOKEN = process.env.ALIHSAN_AUTH_TOKEN || 'BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': AUTH_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 45000
});

/**
 * 1. Duba Bayanan Asusu da Wallet Balance
 * Endpoint: /user.php
 */
async function getAlIhsanUserProfile() {
  try {
    const response = await client.get('/user.php');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      raw: error.response?.data
    };
  }
}

/**
 * 2. Sayen Data Bundles (MTN, Airtel, Glo, 9mobile)
 * Endpoint: /data.php
 */
async function purchaseData({ network, plan, mobileNumber, portedNumber = true }) {
  try {
    const response = await client.post('/data.php', {
      network,
      plan,
      mobile_number: mobileNumber,
      Ported_number: portedNumber
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      raw: error.response?.data
    };
  }
}

/**
 * 3. Sayen Airtime VTU
 * Endpoint: /airtime.php
 */
async function purchaseAirtime({ network, amount, mobileNumber, airtimeType = 'VTU' }) {
  try {
    const response = await client.post('/airtime.php', {
      network,
      amount,
      mobile_number: mobileNumber,
      airtime_type: airtimeType,
      Ported_number: true
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      raw: error.response?.data
    };
  }
}

/**
 * 4. Tabbatar da Lambar Meter ta Wuta (Electricity Validation)
 * Endpoint: /validate-meter.php ko /bill.php
 */
async function validateElectricityMeter({ discoName, meterNumber, meterType = 'PREPAID' }) {
  try {
    const response = await client.post('/validate-meter.php', {
      disco_name: discoName,
      meter_number: meterNumber,
      meter_type: meterType
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      raw: error.response?.data
    };
  }
}

/**
 * 5. Biyan Kuɗin Wuta / Samar da Token (Electricity Payment)
 * Endpoint: /bill.php ko /electricity.php
 */
async function payElectricityBill({ discoName, meterNumber, amount, customerPhone, meterType = 'PREPAID' }) {
  try {
    const response = await client.post('/electricity.php', {
      disco_name: discoName,
      meter_number: meterNumber,
      amount: amount,
      customer_phone: customerPhone,
      meter_type: meterType
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      raw: error.response?.data
    };
  }
}

/**
 * 6. Tabbatar da Lambar IUC / Smartcard ta Cable TV
 * Endpoint: /validate-iuc.php
 */
async function validateCableIUC({ cableCompany, iucNumber }) {
  try {
    const response = await client.post('/validate-iuc.php', {
      cablename: cableCompany, // DSTV, GOTV, STARTIMES
      smart_card_number: iucNumber
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      raw: error.response?.data
    };
  }
}

/**
 * 7. Biyan Kuɗin Cable TV (DSTV, GOTV, Startimes)
 * Endpoint: /cablesub.php
 */
async function purchaseCableSubscription({ cableCompany, cablePlan, iucNumber }) {
  try {
    const response = await client.post('/cablesub.php', {
      cablename: cableCompany,
      cableplan: cablePlan,
      smart_card_number: iucNumber
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      raw: error.response?.data
    };
  }
}

module.exports = {
  getAlIhsanUserProfile,
  purchaseData,
  purchaseAirtime,
  validateElectricityMeter,
  payElectricityBill,
  validateCableIUC,
  purchaseCableSubscription
};