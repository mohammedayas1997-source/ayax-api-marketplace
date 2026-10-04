/**
 * MyMTN Web/App Gateway Engine
 * ayax-api-marketplace - Direct Server-to-MTN Automation (₦0 Fee)
 */
const axios = require("axios");
const mongoose = require("mongoose");

// MyMTN Web API Gateway Endpoints
const MYMTN_BASE_URL = process.env.MYMTN_API_URL || "https://mymtn.com.ng/api/v1";

class MyMTNGatewayService {
  constructor() {
    this.client = axios.create({
      baseURL: MYMTN_BASE_URL,
      timeout: 30000,
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 MyMTN/3.0.0",
        "X-App-Version": "3.0.0",
        "Origin": "https://mymtn.com.ng",
        "Referer": "https://mymtn.com.ng/"
      }
    });
  }

  // Tsaftace lambar waya zuwa 234... ko 080...
  formatPhone(phone) {
    let clean = String(phone).replace(/\D/g, "");
    if (clean.startsWith("234") && clean.length === 13) {
      return `0${clean.slice(3)}`;
    }
    if (clean.length === 10 && !clean.startsWith("0")) {
      return `0${clean}`;
    }
    return clean;
  }

  /**
   * 1. Neman OTP daga MTN
   * @param {string} phone - Lambar SIM din da ke da data (misali: 08161444444)
   */
  async requestOtp(phone) {
    const formattedPhone = this.formatPhone(phone);
    console.log(`📡 [MYMTN] Requesting OTP for SIM: ${formattedPhone}`);

    try {
      const response = await this.client.post("/auth/otp/request", {
        msisdn: formattedPhone,
        channel: "WEB"
      });

      return {
        success: true,
        message: `OTP sent successfully to ${formattedPhone}`,
        sessionId: response.data?.sessionId || response.data?.data?.sessionId || null,
        data: response.data
      };
    } catch (error) {
      console.error("❌ [MYMTN OTP ERROR]:", error.response?.data || error.message);
      // Mock / Simulation fallback idan MTN endpoint na bukatan proxy/custom headers
      return {
        success: false,
        message: error.response?.data?.message || error.message || "Failed to trigger OTP from MTN"
      };
    }
  }

  /**
   * 2. Tabbatar da OTP & Ajiye Session Token a Database
   * @param {string} phone - Lambar SIM din
   * @param {string} otp - Lambar OTP da aka turo ta SMS
   * @param {string} sessionId - Session ID idan an samu a matakin farko
   */
  async verifyOtpAndSaveSession(phone, otp, sessionId = null) {
    const formattedPhone = this.formatPhone(phone);
    console.log(`🔐 [MYMTN] Verifying OTP for: ${formattedPhone}`);

    try {
      const response = await this.client.post("/auth/otp/verify", {
        msisdn: formattedPhone,
        otp: String(otp).trim(),
        sessionId: sessionId
      });

      const token = response.data?.token || response.data?.data?.token || response.data?.accessToken;
      const refreshToken = response.data?.refreshToken || null;

      if (!token) {
        throw new Error("MTN did not return a valid authentication token.");
      }

      // Adana session a Database (Native MongoDB collection 'gatewaysims')
      const db = mongoose.connection?.db;
      const simDoc = {
        phone: formattedPhone,
        network: "MTN",
        token: token,
        refreshToken: refreshToken,
        status: "ACTIVE",
        lastActive: new Date(),
        updatedAt: new Date()
      };

      if (db) {
        await db.collection("gatewaysims").updateOne(
          { phone: formattedPhone },
          { $set: simDoc, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        );
      }

      return {
        success: true,
        message: `MTN SIM ${formattedPhone} authenticated & linked successfully!`,
        token: token
      };
    } catch (error) {
      console.error("❌ [MYMTN VERIFY ERROR]:", error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message || "Invalid OTP code"
      };
    }
  }

  /**
   * 3. Ɗauko Session Token na SIM mai aiki
   */
  async getActiveSimSession(preferredPhone = null) {
    const db = mongoose.connection?.db;
    if (!db) return null;

    let query = { network: "MTN", status: "ACTIVE" };
    if (preferredPhone) {
      query.phone = this.formatPhone(preferredPhone);
    }

    const sim = await db.collection("gatewaysims").findOne(query);
    return sim;
  }

  /**
   * 4. Fitar da Data (Data Transfer / Share Data)
   * @param {object} params - { recipientPhone, volumeMB, pin, gatewayPhone }
   */
  async transferData({ recipientPhone, volumeMB, pin = "2026", gatewayPhone = null }) {
    const targetRecipient = this.formatPhone(recipientPhone);
    const activeSim = await this.getActiveSimSession(gatewayPhone);

    if (!activeSim || !activeSim.token) {
      throw new Error("No active MTN Gateway SIM found. Please link an MTN SIM via OTP first.");
    }

    console.log(`🚀 [MYMTN TRANSFER] Transferring ${volumeMB}MB from ${activeSim.phone} to ${targetRecipient}...`);

    try {
      const response = await this.client.post("/data/transfer", {
        senderMsisdn: activeSim.phone,
        receiverMsisdn: targetRecipient,
        volume: Number(volumeMB),
        pin: String(pin)
      }, {
        headers: {
          Authorization: `Bearer ${activeSim.token}`
        }
      });

      console.log("✅ [MYMTN TRANSFER SUCCESS]:", response.data);

      return {
        success: true,
        message: `${volumeMB}MB transferred successfully from ${activeSim.phone} to ${targetRecipient}`,
        data: response.data
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "MTN Transfer failed";
      console.error("❌ [MYMTN TRANSFER FAILED]:", errMsg);

      // Idan session ya mutu (Token expired / Unauthorized 401)
      if (error.response?.status === 401) {
        const db = mongoose.connection?.db;
        if (db) {
          await db.collection("gatewaysims").updateOne(
            { phone: activeSim.phone },
            { $set: { status: "EXPIRED", error: "Session expired. Requires OTP login." } }
          );
        }
        throw new Error(`MTN Gateway SIM session expired for ${activeSim.phone}. Please re-authenticate.`);
      }

      throw new Error(errMsg);
    }
  }
}

module.exports = new MyMTNGatewayService();
