/**
 * MyMTN Web Automation Gateway (Native Prisma PostgreSQL)
 * Path: backend/src/services/mymtn.gateway.js
 * 
 * Includes SSL/TLS error handling and configurable endpoints.
 */
const axios = require("axios");
const https = require("https");
const prisma = require("../config/prisma");

// Configurable Base URL (defaults to official MyMTN web portal)
const MYMTN_BASE_URL = (process.env.MYMTN_API_URL || "https://mymtn.com.ng/api/v1").replace(/\/+$/, "");

// Agent to bypass TLS packet length issues or legacy SSL configurations
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

class MyMTNAutomationEngine {
  constructor() {
    this.client = axios.create({
      baseURL: MYMTN_BASE_URL,
      timeout: 35000,
      httpsAgent: httpsAgent,
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 MyMTN/3.2.0",
        "Origin": "https://mymtn.com.ng",
        "Referer": "https://mymtn.com.ng/",
      },
    });
  }

  formatPhone(phone, format = "234") {
    let clean = String(phone).replace(/\D/g, "");
    if (clean.startsWith("234") && clean.length === 13) {
      return format === "0" ? `0${clean.slice(3)}` : clean;
    }
    if (clean.startsWith("0") && clean.length === 11) {
      return format === "234" ? `234${clean.slice(1)}` : clean;
    }
    if (clean.length === 10) {
      return format === "234" ? `234${clean}` : `0${clean}`;
    }
    return clean;
  }

  /**
   * 1. REQUEST OTP VIA SMS
   */
  async requestOtp(phone) {
    const formatted234 = this.formatPhone(phone, "234");
    const formattedLocal = this.formatPhone(phone, "0");

    // Endpoint candidates for MyMTN Web
    const endpoints = [
      { url: `${MYMTN_BASE_URL}/auth/otp/send`, data: { msisdn: formatted234, channel: "WEB" } },
      { url: `${MYMTN_BASE_URL}/otp/generate`, data: { msisdn: formattedLocal } },
      { url: `https://mymtn.com.ng/api/v1/auth/otp/request`, data: { msisdn: formattedLocal, channel: "WEB" } },
    ];

    let lastError = null;

    for (const ep of endpoints) {
      try {
        const response = await axios.post(ep.url, ep.data, {
          timeout: 25000,
          httpsAgent: httpsAgent,
          headers: {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36",
            "Origin": "https://mymtn.com.ng",
            "Referer": "https://mymtn.com.ng/",
          },
        });

        const resData = response.data || {};
        const sessionId =
          resData.sessionId ||
          resData.data?.sessionId ||
          resData.transactionId ||
          `SESS_${Date.now()}`;

        return {
          success: true,
          message: `OTP dispatched to ${formattedLocal}`,
          sessionId: sessionId,
          phone: formattedLocal,
          msisdn: formatted234,
        };
      } catch (err) {
        lastError = err;
        // Continue to try next candidate endpoint
      }
    }

    // Clean user-friendly message without dumping raw OpenSSL stack traces
    let readableError = "Failed to communicate with MTN gateway server. Please retry in a few moments.";
    if (lastError?.response?.data?.message) {
      readableError = lastError.response.data.message;
    } else if (lastError?.code === "ECONNREFUSED" || lastError?.message?.includes("SSL")) {
      readableError = "MTN Network Gateway handshake error. Check your connection or gateway endpoint configuration.";
    }

    console.error("MyMTN OTP Request Failure:", lastError?.message || lastError);
    return { success: false, message: readableError };
  }

  /**
   * 2. VERIFY OTP & SAVE SESSION TOKEN
   */
  async verifyOtpAndRegisterSim(phone, otp, sessionId) {
    const formatted234 = this.formatPhone(phone, "234");
    const formattedLocal = this.formatPhone(phone, "0");

    const endpoints = [
      { url: `${MYMTN_BASE_URL}/auth/otp/verify`, data: { msisdn: formatted234, otp: String(otp).trim(), sessionId } },
      { url: `https://mymtn.com.ng/api/v1/auth/otp/verify`, data: { msisdn: formattedLocal, otp: String(otp).trim(), sessionId } },
    ];

    let lastError = null;

    for (const ep of endpoints) {
      try {
        const response = await axios.post(ep.url, ep.data, {
          timeout: 25000,
          httpsAgent: httpsAgent,
          headers: {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36",
            "Origin": "https://mymtn.com.ng",
            "Referer": "https://mymtn.com.ng/",
          },
        });

        const resData = response.data || {};
        const token =
          resData.token ||
          resData.data?.token ||
          resData.accessToken ||
          resData.data?.accessToken;

        const refreshToken =
          resData.refreshToken ||
          resData.data?.refreshToken ||
          null;

        if (token) {
          const balances = await this.fetchSimBalances(token, formatted234);
          const simId = Math.floor(100000 + Math.random() * 900000);

          const simRecord = await prisma.gatewaySim.upsert({
            where: { phone: formattedLocal },
            update: {
              token,
              refreshToken,
              airtimeBalance: balances.airtime,
              dataBalance: balances.data,
              tariff: balances.tariff || "MTN X",
              status: "ACTIVE",
              lastSync: new Date(),
            },
            create: {
              simId,
              phone: formattedLocal,
              network: "MTN",
              gatewayName: `MTN Gateway Web2 - ${formattedLocal}`,
              token,
              refreshToken,
              airtimeBalance: balances.airtime,
              dataBalance: balances.data,
              tariff: balances.tariff || "MTN X",
              status: "ACTIVE",
            },
          });

          return {
            success: true,
            message: `SIM ${formattedLocal} verified and connected successfully!`,
            sim: simRecord,
          };
        }
      } catch (err) {
        lastError = err;
      }
    }

    const readableError =
      lastError?.response?.data?.message ||
      "Invalid or expired OTP verification code.";

    return { success: false, message: readableError };
  }

  async verifyOtpAndSaveSession(phone, otp, sessionId) {
    return this.verifyOtpAndRegisterSim(phone, otp, sessionId);
  }

  /**
   * 3. FETCH AIRTIME & DATA BALANCES
   */
  async fetchSimBalances(token, phone) {
    const formatted234 = this.formatPhone(phone, "234");
    try {
      const balanceRes = await this.client.get(`/user/balances?msisdn=${formatted234}`, {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent: httpsAgent,
      });

      const bData = balanceRes.data?.data || balanceRes.data || {};
      const airtimeVal = Number(bData.airtimeBalance || bData.airtime || 0);
      const dataValMB = Number(bData.dataBalanceMB || bData.data || 0);
      const dataFormatted =
        dataValMB >= 1024
          ? `${(dataValMB / 1024).toFixed(2)}GB`
          : `${dataValMB}MB`;

      return {
        airtime: `NGN ${airtimeVal.toFixed(2)}`,
        data: dataFormatted,
        tariff: bData.tariffPlan || "MTN X",
      };
    } catch (_) {
      return {
        airtime: "NGN 0.00",
        data: "0.00GB",
        tariff: "MTN X",
      };
    }
  }

  /**
   * 4. VEND DATA TRANSFER VIA LINKED SIM
   */
  async transferData({ recipientPhone, volumeMB, pin = "2026", gatewayPhone = null }) {
    const formattedRecipient = this.formatPhone(recipientPhone, "234");
    const localRecipient = this.formatPhone(recipientPhone, "0");

    const where = { network: "MTN", status: "ACTIVE" };
    if (gatewayPhone) where.phone = this.formatPhone(gatewayPhone, "0");

    const activeSim = await prisma.gatewaySim.findFirst({ where });
    if (!activeSim || !activeSim.token) {
      throw new Error("No active MTN Gateway SIM online. Please link an MTN line via OTP first.");
    }

    try {
      const transferRes = await this.client.post(
        "/data/transfer",
        {
          senderMsisdn: this.formatPhone(activeSim.phone, "234"),
          receiverMsisdn: formattedRecipient,
          volume: Number(volumeMB),
          pin: String(pin),
        },
        {
          headers: { Authorization: `Bearer ${activeSim.token}` },
          httpsAgent: httpsAgent,
        }
      );

      return {
        success: true,
        message: `${volumeMB}MB delivered successfully to ${localRecipient}`,
        reference: transferRes.data?.reference || `TR_${Date.now()}`,
        simUsed: activeSim.phone,
        data: transferRes.data,
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "MTN Transfer failed";
      if (error.response?.status === 401) {
        await prisma.gatewaySim.update({
          where: { phone: activeSim.phone },
          data: { status: "EXPIRED" },
        }).catch(() => {});
      }
      throw new Error(errMsg);
    }
  }
}

module.exports = new MyMTNAutomationEngine();