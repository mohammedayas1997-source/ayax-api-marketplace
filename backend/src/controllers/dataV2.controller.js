const axios = require("axios");

const AUTOSYNC_API_URL = "https://autosyncng.com/api";
const AUTOSYNC_ACCESS_TOKEN =
  process.env.AUTOSYNC_TOKEN || "1473|UI7nINVKvWlV1oydtw25JLagPhnZ7MP09d79e6c9";

class DataV2Controller {
  async getDataPlansGrouped(req, res) {
    try {
      try {
        const autoSyncRes = await axios.get(`${AUTOSYNC_API_URL}/v2/data`, {
          headers: {
            Authorization: `Bearer ${AUTOSYNC_ACCESS_TOKEN}`,
            Accept: "application/json",
          },
          timeout: 15000,
        });

        if (autoSyncRes.data && autoSyncRes.data.status === "ok") {
          return res.status(200).json(autoSyncRes.data);
        }
      } catch (externalErr) {
        console.warn("AutoSyncNG v2 data fallback:", externalErr.message);
      }

      // Catalog na gida idan ba a samu sadarwa da waje ba
      return res.status(200).json({
        status: "ok",
        message: "data fetched",
        data: {
          category: {
            id: 2,
            name: "Data Gifting",
            type: "data",
            products: [
              {
                id: 2,
                name: "MTN Gifting",
                code: "mtn",
                charges_fmt: "Free",
                groups: [
                  {
                    id: 1,
                    name: "Awoof / Special Offers",
                    slug: "awoof",
                    sort_order: 0,
                    variations: [
                      {
                        id: 405,
                        name: "3.5GB 2-Days Awoof Bundle",
                        code: "NACT_NG_Data_2002",
                        amount: 500,
                      },
                    ],
                  },
                  {
                    id: 3,
                    name: "Daily",
                    slug: "daily",
                    sort_order: 10,
                    variations: [
                      {
                        id: 404,
                        name: "1GB Daily Digital Bundle",
                        code: "NACT_NG_Data_2001",
                        amount: 200,
                      },
                    ],
                  },
                  {
                    id: 5,
                    name: "Weekly",
                    slug: "weekly",
                    sort_order: 20,
                    variations: [
                      {
                        id: 406,
                        name: "15GB Weekly Digital Bundle",
                        code: "NACT_NG_Data_2003",
                        amount: 2000,
                      },
                    ],
                  },
                  {
                    id: null,
                    name: "Others",
                    slug: "ungrouped",
                    sort_order: 9999,
                    variations: [
                      {
                        id: 410,
                        name: "Unclassified Bundle",
                        code: "NACT_NG_Data_2099",
                        amount: 300,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      });
    } catch (err) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  }
}

module.exports = new DataV2Controller();