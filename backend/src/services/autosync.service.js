const axios = require("axios");

const AUTOSYNC_API_URL = "https://autosyncng.com/api";
const AUTOSYNC_ACCESS_TOKEN =
  process.env.AUTOSYNC_TOKEN || "1473|UI7nINVKvWlV1oydtw25JLagPhnZ7MP09d79e6c9";

class AutoSyncService {
  /**
   * Tura odar Data ta AutoSyncNG API
   */
  async purchaseData(params) {
    const { phone, network, planCode, amount, reference } = params;

    const payload = {
      network: String(network).toUpperCase(),
      phone: String(phone),
      plan: String(planCode),
      reference: String(reference),
    };

    try {
      const response = await axios.post(`${AUTOSYNC_API_URL}/data`, payload, {
        headers: {
          Authorization: `Bearer ${AUTOSYNC_ACCESS_TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 35000,
      });

      return {
        success: true,
        status: "SUCCESSFUL",
        data: response.data,
      };
    } catch (error) {
      const errData = error.response?.data;
      throw new Error(errData?.message || errData?.desc || error.message);
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