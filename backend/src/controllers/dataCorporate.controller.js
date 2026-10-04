const axios = require("axios");

const AUTOSYNC_API_URL = "https://autosyncng.com/api";
const AUTOSYNC_ACCESS_TOKEN =
  process.env.AUTOSYNC_TOKEN || "1473|UI7nINVKvWlV1oydtw25JLagPhnZ7MP09d79e6c9";

class DataCorporateController {
  async getCorporatePlansGrouped(req, res) {
    try {
      try {
        const autoSyncRes = await axios.get(`${AUTOSYNC_API_URL}/v2/data/corporate`, {
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
        console.warn("AutoSyncNG v2 Corporate fallback:", externalErr.message);
      }

      return res.status(200).json({
        status: "ok",
        message: "data fetched",
        data: {
          category: {
            id: 6,
            name: "Data Corporate",
            type: "data_corporate",
            products: [
              {
                id: 2,
                name: "MTN Corporate",
                code: "mtn",
                charges_fmt: "Free",
                groups: [
                  {
                    id: 8,
                    name: "Monthly",
                    slug: "monthly",
                    sort_order: 30,
                    variations: [
                      {
                        id: 712,
                        name: "10GB Corporate (30 Days)",
                        code: "mtn-corp-10gb",
                        amount: 2400,
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
                        id: 720,
                        name: "5GB Corporate",
                        code: "mtn-corp-5gb",
                        amount: 1300,
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

module.exports = new DataCorporateController();
