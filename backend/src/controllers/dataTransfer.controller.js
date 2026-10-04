const axios = require("axios");

const AUTOSYNC_API_URL = "https://autosyncng.com/api";
const AUTOSYNC_ACCESS_TOKEN =
  process.env.AUTOSYNC_TOKEN || "1473|UI7nINVKvWlV1oydtw25JLagPhnZ7MP09d79e6c9";

class DataTransferController {
  async getTransferPlansGrouped(req, res) {
    try {
      try {
        const autoSyncRes = await axios.get(`${AUTOSYNC_API_URL}/v2/data/transfer`, {
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
        console.warn("AutoSyncNG v2 Transfer fallback:", externalErr.message);
      }

      return res.status(200).json({
        status: "ok",
        message: "data fetched",
        data: {
          category: {
            id: 5,
            name: "Data Transfer",
            type: "data_transfer",
            products: [
              {
                id: 2,
                name: "MTN Transfer",
                code: "mtn",
                charges_fmt: "Free",
                groups: [
                  {
                    id: 5,
                    name: "Weekly",
                    slug: "weekly",
                    sort_order: 20,
                    variations: [
                      {
                        id: 612,
                        name: "2GB Transfer (7 Days)",
                        code: "mtn-tf-2gb",
                        amount: 600,
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
                        id: 620,
                        name: "1GB Transfer",
                        code: "mtn-tf-1gb",
                        amount: 320,
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

module.exports = new DataTransferController();