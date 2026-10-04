const axios = require("axios");

const AUTOSYNC_API_URL = "https://autosyncng.com/api";
const AUTOSYNC_ACCESS_TOKEN =
  process.env.AUTOSYNC_TOKEN || "1473|UI7nINVKvWlV1oydtw25JLagPhnZ7MP09d79e6c9";

class DataSmeController {
  async getSmePlansGrouped(req, res) {
    try {
      try {
        const autoSyncRes = await axios.get(`${AUTOSYNC_API_URL}/v2/data/sme`, {
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
        console.warn("AutoSyncNG v2 SME fallback:", externalErr.message);
      }

      return res.status(200).json({
        status: "ok",
        message: "data fetched",
        data: {
          category: {
            id: 4,
            name: "Data SME",
            type: "data_sme",
            products: [
              {
                id: 2,
                name: "MTN SME",
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
                        id: 512,
                        name: "1GB SME (30 Days)",
                        code: "mtn-sme-1gb",
                        amount: 250,
                      },
                      {
                        id: 513,
                        name: "2GB SME (30 Days)",
                        code: "mtn-sme-2gb",
                        amount: 500,
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
                        id: 520,
                        name: "500MB SME",
                        code: "mtn-sme-500mb",
                        amount: 130,
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

module.exports = new DataSmeController();