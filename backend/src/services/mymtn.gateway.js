/**
 * AYAX MTN Gateway
 * Production MTN Nigeria MADAPI Integration
 *
 * Supported:
 * - MTN OAuth 2.0 / Client Credentials
 * - MTN Customer Profiles V2
 * - MTN Customer Data Transfer
 * - MTN Data Gifting
 *
 * IMPORTANT:
 * Customer Authorization / MyMTN SMS OTP is NOT implemented here
 * because the official MTN Nigeria Customer Authorization product is
 * currently marked "COMING SOON".
 */

const axios = require("axios");
const crypto = require("crypto");
const prisma = require("../config/prisma");

class MyMTNGateway {
  constructor() {
    this.oauthUrl =
      process.env.MTN_OAUTH_URL ||
      "https://api.mtn.com/v1/oauth/access_token";

    this.apiBaseUrl =
      process.env.MTN_API_BASE_URL ||
      "https://api.mtn.com";

    this.consumerKey = process.env.MTN_CONSUMER_KEY;
    this.consumerSecret = process.env.MTN_CONSUMER_SECRET;

    /*
     * MTN products such as Profiles V2 require X-API-Key
     * according to the official Swagger specification.
     */
    this.apiKey =
      process.env.MTN_API_KEY ||
      process.env.MTN_CONSUMER_KEY ||
      null;

    this.dataGiftingApiKey =
      process.env.MTN_DATA_GIFTING_API_KEY ||
      this.apiKey;

    this.token = null;
    this.tokenExpiresAt = 0;
  }

  // ============================================================
  // PHONE FORMAT
  // ============================================================

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

  // ============================================================
  // VALIDATION
  // ============================================================

  validateConfig() {
    const missing = [];

    if (!this.consumerKey) {
      missing.push("MTN_CONSUMER_KEY");
    }

    if (!this.consumerSecret) {
      missing.push("MTN_CONSUMER_SECRET");
    }

    if (missing.length) {
      throw new Error(
        `MTN Gateway configuration missing: ${missing.join(", ")}`
      );
    }
  }

  // ============================================================
  // TRANSACTION ID
  // ============================================================

  transactionId(prefix = "AYAX") {
    const random = crypto
      .randomBytes(8)
      .toString("hex")
      .toUpperCase();

    return `${prefix}${Date.now().toString().slice(-8)}${random.slice(
      0,
      4
    )}`.slice(0, 20);
  }

  // ============================================================
  // AXIOS ERROR PARSER
  // ============================================================

  getErrorMessage(error, fallback = "MTN API request failed") {
    const data = error?.response?.data;

    if (!data) {
      return error?.message || fallback;
    }

    return (
      data.statusMessage ||
      data.message ||
      data.error_description ||
      data.error ||
      data.supportMessage ||
      fallback
    );
  }

  // ============================================================
  // 1. MTN OAUTH TOKEN
  // ============================================================

  async getAccessToken(forceRefresh = false) {
    this.validateConfig();

    const now = Date.now();

    /*
     * Reuse token until shortly before expiration.
     * MTN recommends token reuse instead of requesting one
     * for every API call.
     */
    if (
      !forceRefresh &&
      this.token &&
      this.tokenExpiresAt > now + 60 * 1000
    ) {
      return this.token;
    }

    try {
      const response = await axios.post(
        this.oauthUrl,
        new URLSearchParams({
          grant_type: "client_credentials",
        }).toString(),
        {
          timeout: 15000,
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
            Accept: "application/json",
          },

          /*
           * MTN OAuth client credentials.
           */
          auth: {
            username: this.consumerKey,
            password: this.consumerSecret,
          },
        }
      );

      const data = response.data || {};

      const accessToken =
        data.access_token ||
        data.accessToken ||
        data.token;

      if (!accessToken) {
        throw new Error(
          "MTN OAuth response did not contain an access token."
        );
      }

      const expiresIn = Number(
        data.expires_in ||
        data.expiresIn ||
        3600
      );

      this.token = accessToken;

      this.tokenExpiresAt =
        Date.now() +
        Math.max(expiresIn - 60, 60) * 1000;

      return accessToken;
    } catch (error) {
      console.error(
        "❌ MTN OAuth error:",
        this.getErrorMessage(
          error,
          "Unable to authenticate with MTN"
        )
      );

      throw new Error(
        this.getErrorMessage(
          error,
          "MTN OAuth authentication failed."
        )
      );
    }
  }

  // ============================================================
  // COMMON HEADERS
  // ============================================================

  async getHeaders(options = {}) {
    const token = await this.getAccessToken();

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    if (options.transactionId) {
      headers.transactionId = options.transactionId;
    }

    if (options.originChannelId) {
      headers["x-origin-channelid"] =
        options.originChannelId;
    }

    if (options.countryCode) {
      headers["x-country-code"] =
        options.countryCode;
    }

    return headers;
  }

  // ============================================================
  // 2. CUSTOMER OTP
  // ============================================================

  async requestOtp(phone) {
    const formattedPhone = this.formatPhone(phone, "0");

    /*
     * DO NOT fake this.
     *
     * MTN Customer Authorization NG is currently listed as
     * COMING SOON in the official developer portal.
     *
     * Therefore there is no verified public production endpoint
     * that we can safely use here for MyMTN SMS OTP.
     */

    return {
      success: false,
      supported: false,
      code: "MTN_CUSTOMER_AUTHORIZATION_UNAVAILABLE",
      message:
        "MTN Customer Authorization / MyMTN SMS OTP is not currently available through the published MTN Nigeria API specification.",
      phone: formattedPhone,
    };
  }

  // ============================================================
  // 3. VERIFY OTP
  // ============================================================

  async verifyOtpAndRegisterSim(phone, otp, sessionId) {
    return {
      success: false,
      supported: false,
      code: "MTN_CUSTOMER_AUTHORIZATION_UNAVAILABLE",
      message:
        "SIM OTP verification cannot be completed through the current public MTN API. No fake OTP or test token is generated.",
      phone: this.formatPhone(phone, "0"),
    };
  }

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

  // ============================================================
  // 4. CUSTOMER PROFILE + BALANCE
  // ============================================================

  async fetchCustomerProfile(phone) {
    const msisdn = this.formatPhone(phone, "234");

    if (!msisdn || msisdn.length !== 13) {
      throw new Error("Invalid MTN phone number.");
    }

    try {
      const headers = await this.getHeaders();

      const response = await axios.get(
        `${this.apiBaseUrl}/v2/customers/${encodeURIComponent(
          msisdn
        )}`,
        {
          timeout: 20000,
          headers,
          params: {
            propset: "full",
          },
        }
      );

      return response.data;
    } catch (error) {
      const message = this.getErrorMessage(
        error,
        "Unable to fetch MTN customer profile."
      );

      console.error(
        `❌ MTN Profile ${msisdn}:`,
        message
      );

      throw new Error(message);
    }
  }

  // ============================================================
  // 5. EXTRACT BALANCE FROM CUSTOMER PROFILE
  // ============================================================

  extractBalances(profile) {
    const balances = [];

    const plans = Array.isArray(profile?.plans)
      ? profile.plans
      : [];

    for (const plan of plans) {
      const planBalances = Array.isArray(plan?.balance)
        ? plan.balance
        : [];

      for (const balance of planBalances) {
        const data = balance?.data || balance;

        if (!data) continue;

        balances.push({
          balanceType:
            data.balanceType ||
            data.type ||
            "UNKNOWN",

          amount:
            data.amount ??
            data.value ??
            "0",

          currency:
            data.currency ||
            "NGN",

          expiryDate:
            data.expiryDate ||
            null,
        });
      }
    }

    return balances;
  }

  // ============================================================
  // 6. FETCH SIM BALANCES
  // ============================================================

  async fetchSimBalances(tokenOrPhone, phone = null) {
    /*
     * Backward compatibility:
     *
     * Old code called:
     * fetchSimBalances(token, phone)
     *
     * New code can call:
     * fetchSimBalances(phone)
     */

    const targetPhone =
      phone || tokenOrPhone;

    const formatted234 =
      this.formatPhone(targetPhone, "234");

    const profile =
      await this.fetchCustomerProfile(
        formatted234
      );

    const balances =
      this.extractBalances(profile);

    let airtime = null;
    let data = null;
    let tariff = null;

    for (const balance of balances) {
      const type =
        String(balance.balanceType || "")
          .toUpperCase();

      const amount = Number(balance.amount || 0);

      if (
        type.includes("VOICE") ||
        type.includes("AIRTIME") ||
        type.includes("MAIN")
      ) {
        airtime = `NGN ${amount.toFixed(2)}`;
      }

      if (
        type.includes("DATA") ||
        type.includes("INTERNET")
      ) {
        const gb = amount / 1024;

        data =
          amount >= 1024
            ? `${gb.toFixed(2)}GB`
            : `${amount}MB`;
      }
    }

    /*
     * Try to extract billing/tariff plan.
     */
    if (Array.isArray(profile?.plans)) {
      const activePlan =
        profile.plans.find(
          (p) =>
            String(p?.status || "").toLowerCase() ===
            "active"
        );

      tariff =
        activePlan?.id ||
        activePlan?.name ||
        null;
    }

    return {
      airtime:
        airtime || "NGN 0.00",

      data:
        data || "0MB",

      tariff:
        tariff || "Unknown",

      balances,
      profile,
    };
  }

  // ============================================================
  // 7. SYNC EXISTING GATEWAY SIM
  // ============================================================

  async syncGatewaySim(phone) {
    const formattedLocal =
      this.formatPhone(phone, "0");

    const formatted234 =
      this.formatPhone(phone, "234");

    const balances =
      await this.fetchSimBalances(
        formatted234
      );

    const existing =
      await prisma.gatewaySim.findUnique({
        where: {
          phone: formattedLocal,
        },
      });

    if (!existing) {
      throw new Error(
        `Gateway SIM ${formattedLocal} is not registered in the database.`
      );
    }

    const updated =
      await prisma.gatewaySim.update({
        where: {
          phone: formattedLocal,
        },
        data: {
          airtimeBalance:
            balances.airtime,

          dataBalance:
            balances.data,

          tariff:
            balances.tariff,

          status: "ACTIVE",

          lastSync: new Date(),
        },
      });

    return {
      success: true,
      sim: updated,
      balances,
    };
  }

  // ============================================================
  // 8. CUSTOMER DATA TRANSFER
  // ============================================================

  async transferData({
    recipientPhone,
    volumeMB,
    pin = null,
    gatewayPhone = null,
    productCode = null,
    callbackUrl = null,
  }) {
    const recipientMsisdn =
      this.formatPhone(
        recipientPhone,
        "234"
      );

    const senderMsisdn =
      this.formatPhone(
        gatewayPhone,
        "234"
      );

    const localRecipient =
      this.formatPhone(
        recipientPhone,
        "0"
      );

    if (!recipientMsisdn) {
      throw new Error(
        "Recipient MTN number is required."
      );
    }

    if (!senderMsisdn) {
      throw new Error(
        "Gateway/sender MTN number is required."
      );
    }

    const amountMB =
      Number(volumeMB);

    if (
      !Number.isFinite(amountMB) ||
      amountMB <= 0
    ) {
      throw new Error(
        "Invalid data transfer volume."
      );
    }

    /*
     * The official Customer Transfer API expects
     * transferAmount as a string and also requires:
     *
     * receiverMsisdn
     * targetSystem
     * type
     *
     * The exact productCode/productId must come from
     * MTN's configured charging/catalog setup.
     */

    const transactionId =
      this.transactionId("AYAX");

    const body = {
      receiverMsisdn:
        recipientMsisdn,

      type:
        "DATA",

      transferAmount:
        String(amountMB),

      targetSystem:
        process.env.MTN_TARGET_SYSTEM ||
        "AYAX",

      ...(productCode
        ? { productCode }
        : {}),

      ...(pin
        ? { pin: String(pin) }
        : {}),

      ...(callbackUrl
        ? { callbackUrl }
        : {}),

      additionalInformation: [
        {
          name: "partner",
          description:
            process.env.MTN_PARTNER_NAME ||
            "AYAX GLOBAL VENTURES LTD",
        },
      ],
    };

    try {
      const headers =
        await this.getHeaders({
          transactionId,

          countryCode:
            process.env.MTN_COUNTRY_CODE ||
            "NG",

          originChannelId:
            process.env.MTN_ORIGIN_CHANNEL_ID ||
            "AYAX",
        });

      const url =
        `${this.apiBaseUrl}/v1/customers/${encodeURIComponent(
          senderMsisdn
        )}`;

      console.log(
        `📡 MTN DATA TRANSFER ${senderMsisdn} -> ${recipientMsisdn} (${amountMB}MB)`
      );

      const response =
        await axios.post(
          url,
          body,
          {
            timeout: 30000,
            headers,
          }
        );

      const result =
        response.data || {};

      return {
        success: true,

        message:
          result.statusMessage ||
          `${amountMB}MB transferred successfully to ${localRecipient}`,

        reference:
          result.transactionId ||
          transactionId,

        transactionId:
          result.transactionId ||
          transactionId,

        simUsed:
          this.formatPhone(
            gatewayPhone,
            "0"
          ),

        data:
          result,
      };
    } catch (error) {
      const status =
        error?.response?.status;

      const message =
        this.getErrorMessage(
          error,
          "MTN data transfer failed."
        );

      console.error(
        "❌ MTN DATA TRANSFER:",
        status || "",
        message
      );

      throw new Error(
        message
      );
    }
  }

  // ============================================================
  // 9. DATA GIFTING
  // ============================================================

  async giftData({
    senderPhone,
    recipientPhone,
    productCode,
    sendSms = true,
  }) {
    const senderMsisdn =
      this.formatPhone(
        senderPhone,
        "234"
      );

    const receiverMsisdn =
      this.formatPhone(
        recipientPhone,
        "234"
      );

    if (!senderMsisdn) {
      throw new Error(
        "Sender MTN number is required."
      );
    }

    if (!receiverMsisdn) {
      throw new Error(
        "Recipient MTN number is required."
      );
    }

    if (!productCode) {
      throw new Error(
        "MTN Data Gifting productCode is required."
      );
    }

    if (!this.dataGiftingApiKey) {
      throw new Error(
        "MTN_DATA_GIFTING_API_KEY is not configured."
      );
    }

    const transactionId =
      this.transactionId("GIFT");

    const url =
      `${this.apiBaseUrl}/v1/datagifting/customers/${encodeURIComponent(
        senderMsisdn
      )}/dataGifting`;

    const body = {
      receiverMsisdn,
      productCode,
      sendSms: Boolean(sendSms),
    };

    try {
      const response =
        await axios.post(
          url,
          body,
          {
            timeout: 30000,

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",

              "X-API-Key":
                this.dataGiftingApiKey,

              transactionId,
            },
          }
        );

      const result =
        response.data || {};

      return {
        success: true,

        message:
          result.statusMessage ||
          "Data gifting request successful.",

        reference:
          result.transactionId ||
          transactionId,

        transactionId:
          result.transactionId ||
          transactionId,

        data:
          result,
      };
    } catch (error) {
      const message =
        this.getErrorMessage(
          error,
          "MTN Data Gifting failed."
        );

      console.error(
        "❌ MTN DATA GIFTING:",
        message
      );

      throw new Error(message);
    }
  }

  // ============================================================
  // 10. CHECK TRANSFER STATUS
  // ============================================================

  async getTransferStatus(transactionId) {
    if (!transactionId) {
      throw new Error(
        "Transaction ID is required."
      );
    }

    try {
      const headers =
        await this.getHeaders({
          transactionId,
          countryCode:
            process.env.MTN_COUNTRY_CODE ||
            "NG",
        });

      const response =
        await axios.get(
          `${this.apiBaseUrl}/v1/customers/transactionStatus`,
          {
            timeout: 20000,

            headers,

            params: {
              transactionId,

              network:
                process.env.MTN_NETWORK ||
                "MTN",

              operation:
                "DATA_TRANSFER",
            },
          }
        );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw new Error(
        this.getErrorMessage(
          error,
          "Unable to retrieve MTN transaction status."
        )
      );
    }
  }
}

module.exports = new MyMTNGateway();