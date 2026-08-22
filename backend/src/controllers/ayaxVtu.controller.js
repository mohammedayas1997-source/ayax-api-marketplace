const axios = require("axios");
const crypto = require("crypto");
const prisma = require("../config/prisma") || require("../lib/prisma");

const AYAX_API_BASE_URL = process.env.AYAX_API_URL || "https://api.ayaxdata.com/api/v1";
const AYAX_API_KEY = process.env.AYAX_API_KEY;

// Helper: Tabbatar da kiran Ayax API
const ayaxClient = axios.create({
  baseURL: AYAX_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${AYAX_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// 1. Siyan Data (Data Bundles)
exports.buyData = async (req, res) => {
  try {
    const user = req.user;
    const { network, phoneNumber, planCode, amount, pin } = req.body;

    if (!network || !phoneNumber || !planCode) {
      return res.status(400).json({
        success: false,
        message: "Network, phone number, and planCode are required.",
      });
    }

    const cost = Number(amount);
    const reference = "AYX_DATA_" + crypto.randomBytes(6).toString("hex").toUpperCase();

    // Duba Wallet Balance na User
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        success: false,
        message: "Insufficient wallet balance. Please fund your account.",
      });
    }

    // Rage Kudi & Ƙirƙiri PENDING Transaction
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: cost } },
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: "DATA_PURCHASE",
          amount: cost,
          status: "PROCESSING",
          reference,
          description: `${network.toUpperCase()} Data to ${phoneNumber}`,
        },
      }),
    ]);

    // Kira Ayax Upstream API
    try {
      const response = await ayaxClient.post("/data/purchase", {
        network: network.toUpperCase(),
        phone: phoneNumber.trim(),
        planCode: planCode.trim(),
        reference,
      });

      if (response.data?.success || response.data?.status === "success") {
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESSFUL" },
        });

        return res.status(200).json({
          success: true,
          message: `Data bundle successfully delivered to ${phoneNumber}.`,
          reference,
          data: response.data,
        });
      } else {
        throw new Error(response.data?.message || "Ayax API purchase failed");
      }
    } catch (apiErr) {
      console.error("Ayax Data API Error:", apiErr.response?.data || apiErr.message);

      // Refund User nan take idan API ya gaza
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: `Refunded: ${apiErr.response?.data?.message || "Upstream Provider Error"}`,
          },
        }),
      ]);

      return res.status(502).json({
        success: false,
        message: apiErr.response?.data?.message || "Failed to process data via Ayax API. Your wallet has been refunded.",
      });
    }
  } catch (error) {
    console.error("Buy data error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Siyan Airtime (VTU)
exports.buyAirtime = async (req, res) => {
  try {
    const user = req.user;
    const { network, phoneNumber, amount } = req.body;

    if (!network || !phoneNumber || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Network, valid phone number, and positive amount are required.",
      });
    }

    const cost = Number(amount);
    const reference = "AYX_AIRTIME_" + crypto.randomBytes(6).toString("hex").toUpperCase();

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        success: false,
        message: "Insufficient wallet balance.",
      });
    }

    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: cost } },
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: "AIRTIME_PURCHASE",
          amount: cost,
          status: "PROCESSING",
          reference,
          description: `${network.toUpperCase()} Airtime to ${phoneNumber}`,
        },
      }),
    ]);

    try {
      const response = await ayaxClient.post("/airtime/purchase", {
        network: network.toUpperCase(),
        phone: phoneNumber.trim(),
        amount: cost,
        reference,
      });

      if (response.data?.success || response.data?.status === "success") {
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESSFUL" },
        });

        return res.status(200).json({
          success: true,
          message: `Airtime of ₦${cost} sent to ${phoneNumber} successfully.`,
          reference,
          data: response.data,
        });
      } else {
        throw new Error(response.data?.message || "Ayax Airtime failed");
      }
    } catch (apiErr) {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: `Refunded: ${apiErr.response?.data?.message || "Airtime Provider Error"}`,
          },
        }),
      ]);

      return res.status(502).json({
        success: false,
        message: apiErr.response?.data?.message || "Failed to deliver airtime. Wallet refunded.",
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Biya Wutar Lantarki (Electricity Bill / Token)
exports.payElectricity = async (req, res) => {
  try {
    const user = req.user;
    const { disco, meterNumber, meterType, amount } = req.body;

    if (!disco || !meterNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: "Disco name, meter number, and amount are required.",
      });
    }

    const cost = Number(amount);
    const reference = "AYX_ELEC_" + crypto.randomBytes(6).toString("hex").toUpperCase();

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        success: false,
        message: "Insufficient wallet balance.",
      });
    }

    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: cost } },
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: "ELECTRICITY",
          amount: cost,
          status: "PROCESSING",
          reference,
          description: `${disco} Electricity for Meter ${meterNumber}`,
        },
      }),
    ]);

    try {
      const response = await ayaxClient.post("/electricity/purchase", {
        disco,
        meterNumber,
        meterType: meterType || "PREPAID",
        amount: cost,
        reference,
      });

      if (response.data?.success || response.data?.status === "success") {
        const token = response.data?.token || response.data?.data?.token;

        await prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "SUCCESSFUL",
            description: `Token: ${token || "Generated"} | Meter: ${meterNumber}`,
          },
        });

        return res.status(200).json({
          success: true,
          message: "Electricity token generated successfully.",
          token,
          reference,
          data: response.data,
        });
      } else {
        throw new Error(response.data?.message || "Electricity payment failed");
      }
    } catch (apiErr) {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: `Refunded: ${apiErr.response?.data?.message || "Electricity Gateway Error"}`,
          },
        }),
      ]);

      return res.status(502).json({
        success: false,
        message: apiErr.response?.data?.message || "Failed to process electricity. Wallet refunded.",
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Biya Cable TV (DStv, GOtv, StarTimes, Showmax)
exports.payCableTV = async (req, res) => {
  try {
    const user = req.user;
    const { provider, smartCard, packageId, amount } = req.body;

    if (!provider || !smartCard || !packageId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Provider, smartcard number, packageId, and amount are required.",
      });
    }

    const cost = Number(amount);
    const reference = "AYX_CABLE_" + crypto.randomBytes(6).toString("hex").toUpperCase();

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        success: false,
        message: "Insufficient wallet balance.",
      });
    }

    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: cost } },
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: "CABLE_TV",
          amount: cost,
          status: "PROCESSING",
          reference,
          description: `${provider} Subscription for ${smartCard}`,
        },
      }),
    ]);

    try {
      const response = await ayaxClient.post("/cable/purchase", {
        provider,
        smartCard,
        packageId,
        amount: cost,
        reference,
      });

      if (response.data?.success || response.data?.status === "success") {
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESSFUL" },
        });

        return res.status(200).json({
          success: true,
          message: `${provider} subscription activated successfully for ${smartCard}.`,
          reference,
          data: response.data,
        });
      } else {
        throw new Error(response.data?.message || "Cable TV activation failed");
      }
    } catch (apiErr) {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: `Refunded: ${apiErr.response?.data?.message || "Cable TV Gateway Error"}`,
          },
        }),
      ]);

      return res.status(502).json({
        success: false,
        message: apiErr.response?.data?.message || "Failed to activate cable plan. Wallet refunded.",
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};