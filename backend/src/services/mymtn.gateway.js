/**
 * MyMTN NG Gateway Engine
 * Path: backend/src/services/mymtn.gateway.js
 *
 * IMPORTANT:
 * - Do not use undocumented/dead MTN hostnames.
 * - Configure your authorized MTN API endpoint through environment variables.
 * - TEST MODE can be enabled with ALLOW_TEST_SIM_LINK=true.
 */

const axios = require("axios");
const https = require("https");
const prisma = require("../config/prisma");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

class MyMTNAutomationEngine {
  constructor() {
    this.proxyUrl =
      process.env.MYMTN_PROXY_URL ||
      process.env.HTTPS_PROXY ||
      null;

    // Configure these only if you have an authorized MTN integration.
    this.otpRequestUrl =
      process.env.MYMTN_OTP_REQUEST_URL || null;

    this.otpVerifyUrl =
      process.env.MYMTN_OTP_VERIFY_URL || null;

    this.balanceUrl =
      process.env.MYMTN_BALANCE_URL || null;

    this.transferUrl =
      process.env.MYMTN_TRANSFER_URL || null;
  }

  /**
   * Normalize Nigerian phone numbers.
   *
   * 09033738409 -> 2349033738409
   * 09033738409 -> 09033738409
   * 9033738409  -> 2349033738409
   */
  formatPhone(phone, format = "234") {
    let clean = String(phone || "").replace(/\D/g, "");

    if (clean.startsWith("234") && clean.length === 13) {
      return format === "0"
        ? `0${clean.slice(3)}`
        : clean;
    }

    if (clean.startsWith("0") && clean.length === 11) {
      return format === "234"
        ? `234${clean.slice(1)}`
        : clean;
    }

    if (clean.length === 10) {
      return format === "234"
        ? `234${clean}`
        : `0${clean}`;
    }

    return clean;
  }

  /**
   * Basic Nigerian phone validation.
   */
  isValidNigerianPhone(phone) {
    const local = this.formatPhone(phone, "0");

    return /^0\d{10}$/.test(local);
  }

  /**
   * Axios configuration.
   */
  getAxiosConfig(extraHeaders = {}) {
    const config = {
      timeout: Number(process.env.MYMTN_TIMEOUT || 15000),

      httpsAgent,

      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",

        "User-Agent":
          process.env.MYMTN_USER_AGENT ||
          "MyMTN-NG-Gateway/1.0",

        ...extraHeaders,
      },

      validateStatus: () => true,
    };

    if (this.proxyUrl) {
      try {
        const url = new URL(this.proxyUrl);

        config.proxy = {
          protocol: url.protocol.replace(":", ""),
          host: url.hostname,
          port: Number(url.port) || 80,

          auth: url.username
            ? {
                username: decodeURIComponent(url.username),
                password: decodeURIComponent(url.password),
              }
            : undefined,
        };
      } catch (error) {
        console.warn(
          "⚠️ Invalid MYMTN_PROXY_URL:",
          error.message
        );
      }
    }

    return config;
  }

  /**
   * Convert API errors to readable messages.
   */
  getReadableError(error, fallback = "MTN Gateway request failed.") {
    if (!error) {
      return fallback;
    }

    if (error.code === "ENOTFOUND") {
      return `MTN Gateway hostname could not be resolved. Check your configured MTN API URL.`;
    }

    if (error.code === "ECONNABORTED") {
      return "MTN Gateway request timed out.";
    }

    if (error.code === "ETIMEDOUT") {
      return "MTN Gateway connection timed out.";
    }

    if (error.code === "ECONNREFUSED") {
      return "MTN Gateway connection was refused.";
    }

    if (error.response) {
      const data = error.response.data;

      if (typeof data === "string" && data.trim()) {
        return data;
      }

      if (data?.message) {
        return data.message;
      }

      if (data?.error) {
        return typeof data.error === "string"
          ? data.error
          : JSON.stringify(data.error);
      }

      return `MTN Gateway returned HTTP ${error.response.status}.`;
    }

    return error.message || fallback;
  }

  /**
   * Check whether test mode is enabled.
   */
  isTestMode() {
    return (
      process.env.NODE_ENV !== "production" &&
      String(process.env.ALLOW_TEST_SIM_LINK).toLowerCase() === "true"
    );
  }

  /**
   * ============================================================
   * 1. REQUEST OTP
   * ============================================================
   */
  async requestOtp(phone) {
    if (!this.isValidNigerianPhone(phone)) {
      return {
        success: false,
        message: "Invalid Nigerian MTN phone number.",
      };
    }

    const formatted234 = this.formatPhone(phone, "234");
    const formattedLocal = this.formatPhone(phone, "0");

    /**
     * TEST MODE
     *
     * Enable:
     *
     * ALLOW_TEST_SIM_LINK=true
     *
     * OTP:
     * 123456
     */
    if (this.isTestMode()) {
      const sessionId = `TEST_SESS_${Date.now()}`;

      console.log(
        `⚡ [TEST OTP] Simulated OTP for ${formattedLocal}`
      );

      return {
        success: true,
        testMode: true,
        message:
          `Test OTP generated for ${formattedLocal}. ` +
          `Use OTP 123456.`,
        sessionId,
        phone: formattedLocal,
        msisdn: formatted234,
      };
    }

    /**
     * REAL MODE
     *
     * We intentionally DO NOT call:
     *
     * https://mymtn-ng.mtn.ng/...
     *
     * because that hostname caused:
     *
     * getaddrinfo ENOTFOUND mymtn-ng.mtn.ng
     *
     * Instead, configure your authorized MTN API endpoint:
     *
     * MYMTN_OTP_REQUEST_URL=https://your-authorized-endpoint/...
     */
    if (!this.otpRequestUrl) {
      return {
        success: false,
        code: "MTN_OTP_ENDPOINT_NOT_CONFIGURED",
        message:
          "MTN OTP endpoint is not configured. " +
          "Set MYMTN_OTP_REQUEST_URL in your environment " +
          "to your authorized MTN API endpoint.",
      };
    }

    try {
      console.log(
        `📡 [MTN OTP] Requesting OTP for ${formatted234}`
      );

      const response = await axios.post(
        this.otpRequestUrl,
        {
          msisdn: formatted234,
          phone: formattedLocal,
          channel: "WEB",
        },
        this.getAxiosConfig()
      );

      const data = response.data || {};

      if (response.status < 200 || response.status >= 300) {
        return {
          success: false,
          message:
            data.message ||
            data.error ||
            `MTN API returned HTTP ${response.status}.`,
        };
      }

      const sessionId =
        data.sessionId ||
        data.data?.sessionId ||
        data.transactionId ||
        data.data?.transactionId;

      if (!sessionId) {
        console.warn(
          "⚠️ MTN OTP response did not contain sessionId."
        );
      }

      return {
        success: true,
        message: `OTP request submitted for ${formattedLocal}.`,
        sessionId: sessionId || null,
        phone: formattedLocal,
        msisdn: formatted234,
        data,
      };
    } catch (error) {
      console.error(
        "❌ [MTN OTP REQUEST ERROR]",
        error
      );

      return {
        success: false,
        message: this.getReadableError(
          error,
          "Unable to request MTN OTP."
        ),
      };
    }
  }

  /**
   * ============================================================
   * 2. VERIFY OTP & REGISTER SIM
   * ============================================================
   */
  async verifyOtpAndRegisterSim(
    phone,
    otp,
    sessionId
  ) {
    const formatted234 = this.formatPhone(phone, "234");
    const formattedLocal = this.formatPhone(phone, "0");

    if (!this.isValidNigerianPhone(phone)) {
      return {
        success: false,
        message: "Invalid Nigerian MTN phone number.",
      };
    }

    const cleanOtp = String(otp || "").trim();

    if (!cleanOtp) {
      return {
        success: false,
        message: "OTP is required.",
      };
    }

    /**
     * TEST MODE
     */
    if (
      this.isTestMode() &&
      (
        String(sessionId || "").startsWith("TEST_SESS_") ||
        cleanOtp === "123456"
      )
    ) {
      const simId =
        Math.floor(
          100000 + Math.random() * 900000
        );

      const testToken =
        `MYMTN_TOKEN_${Date.now()}_${formattedLocal}`;

      const simRecord =
        await prisma.gatewaySim.upsert({
          where: {
            phone: formattedLocal,
          },

          update: {
            token: testToken,
            refreshToken: null,

            airtimeBalance:
              "NGN 1,450.00",

            dataBalance:
              "15.50GB",

            tariff:
              "MTN Pulse",

            status:
              "ACTIVE",

            lastSync:
              new Date(),
          },

          create: {
            simId,

            phone:
              formattedLocal,

            network:
              "MTN",

            gatewayName:
              `MTN Gateway Web2 - ${formattedLocal}`,

            token:
              testToken,

            refreshToken:
              null,

            airtimeBalance:
              "NGN 1,450.00",

            dataBalance:
              "15.50GB",

            tariff:
              "MTN Pulse",

            status:
              "ACTIVE",
          },
        });

      return {
        success: true,

        testMode: true,

        message:
          `SIM ${formattedLocal} verified and connected successfully in TEST MODE.`,

        sim: simRecord,
      };
    }

    /**
     * REAL MODE
     */
    if (!this.otpVerifyUrl) {
      return {
        success: false,
        code: "MTN_OTP_VERIFY_ENDPOINT_NOT_CONFIGURED",
        message:
          "MTN OTP verification endpoint is not configured. " +
          "Set MYMTN_OTP_VERIFY_URL in your environment.",
      };
    }

    try {
      console.log(
        `🔐 [MTN OTP VERIFY] Verifying ${formatted234}`
      );

      const response = await axios.post(
        this.otpVerifyUrl,

        {
          msisdn:
            formatted234,

          phone:
            formattedLocal,

          otp:
            cleanOtp,

          sessionId:
            sessionId || null,
        },

        this.getAxiosConfig()
      );

      const data =
        response.data || {};

      if (
        response.status < 200 ||
        response.status >= 300
      ) {
        return {
          success: false,

          message:
            data.message ||
            data.error ||
            `MTN API returned HTTP ${response.status}.`,
        };
      }

      const token =
        data.token ||
        data.data?.token ||
        data.accessToken ||
        data.data?.accessToken;

      const refreshToken =
        data.refreshToken ||
        data.data?.refreshToken ||
        null;

      if (!token) {
        return {
          success: false,
          message:
            data.message ||
            "OTP verification succeeded but MTN did not return an access token.",
        };
      }

      const balances =
        await this.fetchSimBalances(
          token,
          formatted234
        );

      const simId =
        Math.floor(
          100000 + Math.random() * 900000
        );

      const simRecord =
        await prisma.gatewaySim.upsert({
          where: {
            phone:
              formattedLocal,
          },

          update: {
            token,

            refreshToken,

            airtimeBalance:
              balances.airtime,

            dataBalance:
              balances.data,

            tariff:
              balances.tariff ||
              "MTN Pulse",

            status:
              "ACTIVE",

            lastSync:
              new Date(),
          },

          create: {
            simId,

            phone:
              formattedLocal,

            network:
              "MTN",

            gatewayName:
              `MTN Gateway Web2 - ${formattedLocal}`,

            token,

            refreshToken,

            airtimeBalance:
              balances.airtime,

            dataBalance:
              balances.data,

            tariff:
              balances.tariff ||
              "MTN Pulse",

            status:
              "ACTIVE",
          },
        });

      return {
        success: true,

        message:
          `SIM ${formattedLocal} authenticated and linked!`,

        sim:
          simRecord,
      };
    } catch (error) {
      console.error(
        "❌ [MTN OTP VERIFY ERROR]",
        error
      );

      return {
        success: false,

        message:
          this.getReadableError(
            error,
            "Invalid or expired OTP code."
          ),
      };
    }
  }

  /**
   * Backward compatibility.
   */
  async verifyOtpAndSaveSession(
    phone,
    otp,
    sessionId
  ) {
    return this.verifyOtpAndRegisterSim(
      phone,
      otp,
      sessionId
    );
  }

  /**
   * ============================================================
   * 3. FETCH AIRTIME & DATA BALANCES
   * ============================================================
   */
  async fetchSimBalances(
    token,
    phone
  ) {
    const formatted234 =
      this.formatPhone(phone, "234");

    /**
     * TEST TOKEN
     */
    if (
      String(token).startsWith(
        "MYMTN_TOKEN_"
      )
    ) {
      return {
        airtime:
          "NGN 1,450.00",

        data:
          "15.50GB",

        tariff:
          "MTN Pulse",
      };
    }

    if (!this.balanceUrl) {
      return {
        airtime:
          "NGN 0.00",

        data:
          "0MB",

        tariff:
          "MTN Pulse",
      };
    }

    try {
      const separator =
        this.balanceUrl.includes("?")
          ? "&"
          : "?";

      const url =
        `${this.balanceUrl}` +
        `${separator}msisdn=${encodeURIComponent(
          formatted234
        )}`;

      const response =
        await axios.get(
          url,

          this.getAxiosConfig({
            Authorization:
              `Bearer ${token}`,
          })
        );

      const bData =
        response.data?.data ||
        response.data ||
        {};

      const airtimeVal =
        Number(
          bData.airtimeBalance ??
          bData.airtime ??
          0
        );

      const dataValMB =
        Number(
          bData.dataBalanceMB ??
          bData.data ??
          0
        );

      const dataFormatted =
        dataValMB >= 1024
          ? `${(
              dataValMB / 1024
            ).toFixed(2)}GB`
          : `${dataValMB}MB`;

      return {
        airtime:
          `NGN ${airtimeVal.toFixed(2)}`,

        data:
          dataFormatted,

        tariff:
          bData.tariffPlan ||
          "MTN Pulse",
      };
    } catch (error) {
      console.warn(
        "⚠️ Unable to fetch MTN balances:",
        this.getReadableError(
          error
        )
      );

      return {
        airtime:
          "NGN 0.00",

        data:
          "0MB",

        tariff:
          "MTN Pulse",
      };
    }
  }

  /**
   * ============================================================
   * 4. TRANSFER DATA
   * ============================================================
   */
  async transferData({
    recipientPhone,
    volumeMB,
    pin = "2026",
    gatewayPhone = null,
  }) {
    const formattedRecipient =
      this.formatPhone(
        recipientPhone,
        "234"
      );

    const localRecipient =
      this.formatPhone(
        recipientPhone,
        "0"
      );

    const amount =
      Number(volumeMB);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new Error(
        "Invalid data volume."
      );
    }

    const where = {
      network: "MTN",
      status: "ACTIVE",
    };

    if (gatewayPhone) {
      where.phone =
        this.formatPhone(
          gatewayPhone,
          "0"
        );
    }

    const activeSim =
      await prisma.gatewaySim.findFirst({
        where,
        orderBy: {
          lastSync: "desc",
        },
      });

    if (
      !activeSim ||
      !activeSim.token
    ) {
      throw new Error(
        "No active MTN Gateway SIM online. Please link an MTN line via OTP first."
      );
    }

    /**
     * TEST MODE TRANSFER
     */
    if (
      this.isTestMode() &&
      String(
        activeSim.token
      ).startsWith(
        "MYMTN_TOKEN_"
      )
    ) {
      return {
        success: true,

        testMode: true,

        message:
          `${amount}MB transferred successfully to ${localRecipient} via MTN Data Share (TEST MODE)`,

        reference:
          `TR_TEST_${Date.now()}`,

        simUsed:
          activeSim.phone,

        data: {
          status:
            "SUCCESSFUL",
        },
      };
    }

    /**
     * REAL TRANSFER
     */
    if (!this.transferUrl) {
      throw new Error(
        "MTN transfer endpoint is not configured. Set MYMTN_TRANSFER_URL in your environment."
      );
    }

    try {
      const transferRes =
        await axios.post(
          this.transferUrl,

          {
            senderMsisdn:
              this.formatPhone(
                activeSim.phone,
                "234"
              ),

            receiverMsisdn:
              formattedRecipient,

            volume:
              amount,

            pin:
              String(pin),
          },

          this.getAxiosConfig({
            Authorization:
              `Bearer ${activeSim.token}`,
          })
        );

      const responseData =
        transferRes.data || {};

      if (
        transferRes.status < 200 ||
        transferRes.status >= 300
      ) {
        throw new Error(
          responseData.message ||
          responseData.error ||
          `MTN transfer failed with HTTP ${transferRes.status}.`
        );
      }

      return {
        success: true,

        message:
          `${amount}MB transferred successfully to ${localRecipient}`,

        reference:
          responseData.reference ||
          responseData.data?.reference ||
          `TR_${Date.now()}`,

        simUsed:
          activeSim.phone,

        data:
          responseData,
      };
    } catch (error) {
      const errMsg =
        this.getReadableError(
          error,
          "MTN Transfer failed."
        );

      if (
        error.response?.status === 401
      ) {
        await prisma.gatewaySim
          .update({
            where: {
              phone:
                activeSim.phone,
            },

            data: {
              status:
                "EXPIRED",
            },
          })
          .catch(() => {});
      }

      throw new Error(
        errMsg
      );
    }
  }
}

module.exports =
  new MyMTNAutomationEngine();