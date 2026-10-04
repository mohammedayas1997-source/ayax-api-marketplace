const axios = require("axios");

const AUTOSYNC_API_URL = "https://autosyncng.com/api";
const AUTOSYNC_ACCESS_TOKEN =
  process.env.AUTOSYNC_TOKEN || "1473|UI7nINVKvWlV1oydtw25JLagPhnZ7MP09d79e6c9";

class AutoSyncService {
  /**
   * Tura odar Data ta AutoSyncNG API
   */
  async purchaseData(params) {
    const { phone, network, planCode, amount, reference, planType, pin } = params;

    const normNetwork = String(network || "mtn").toLowerCase().trim();
    const cleanPhone = String(phone).replace(/\D/g, "");
    const formattedPhone =
      cleanPhone.startsWith("234") && cleanPhone.length === 13
        ? `0${cleanPhone.slice(3)}`
        : cleanPhone;

    // Gano endpoint din da ya dace (sme, transfer, corporate, ko gifting)
    let endpoint = "/data";
    const codeStr = String(planCode || "").toLowerCase();
    const typeStr = String(planType || "").toLowerCase();

    if (typeStr.includes("sme") || codeStr.includes("sme")) {
      endpoint = "/data/sme";
    } else if (
      typeStr.includes("transfer") ||
      codeStr.includes("tf") ||
      codeStr.includes("transfer")
    ) {
      endpoint = "/data/transfer";
    } else if (typeStr.includes("corp") || codeStr.includes("corp")) {
      endpoint = "/data/corporate";
    }

    // Lambar PIN ta hada-hada a AutoSyncNG
    const securityPin =
      pin ||
      params.securityPin ||
      process.env.AUTOSYNC_PIN ||
      process.env.GSM_DATA_PIN ||
      "1997";

    // AutoSyncNG yana buƙatar `variation_code`, `service_id`, `phone`, da kuma `pin`
    const payload = {
      service_id: normNetwork,
      network: normNetwork,
      variation_code: String(planCode),
      variationCode: String(planCode),
      code: String(planCode),
      plan: String(planCode),
      phone: formattedPhone,
      mobile_number: formattedPhone,
      phone_number: formattedPhone,
      pin: String(securityPin),
      ref: String(reference),
      reference: String(reference),
      request_id: String(reference),
    };

    try {
      console.log(`📡 [AUTOSYNC REQUEST]: POST ${AUTOSYNC_API_URL}${endpoint}`, payload);

      const response = await axios.post(`${AUTOSYNC_API_URL}${endpoint}`, payload, {
        headers: {
          Authorization: `Bearer ${AUTOSYNC_ACCESS_TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 45000,
      });

      console.log(`✅ [AUTOSYNC RESPONSE]:`, response.data);

      return {
        success: true,
        status: "SUCCESSFUL",
        data: response.data,
      };
    } catch (error) {
      const errData = error.response?.data;
      console.error("❌ [AUTOSYNC ERROR RESPONSE]:", errData || error.message);

      const errorMessage =
        errData?.message ||
        errData?.error ||
        errData?.errors?.pin?.[0] ||
        errData?.errors?.variation_code?.[0] ||
        errData?.desc ||
        error.message;

      throw new Error(errorMessage);
    }
  }

  /**
   * Duba Balance na Gateway daga AutoSyncNG
   */
  async checkBalance() {
    try {
      const response = await axios.get(`${AUTOSYNC_API_URL}/user`, {
        headers: {
          Authorization: `Bearer ${AUTOSYNC_ACCESS_TOKEN}`,
          Accept: "application/json",
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}

module.exports = new AutoSyncService();