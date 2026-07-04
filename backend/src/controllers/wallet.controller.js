const prisma = require("../config/prisma");
const crypto = require("crypto");
const { emitEvent } = require("../config/socket");
const walletService = require("../services/wallet.service");

exports.getWallet = async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
    });

    return res.json({
      success: true,
      wallet,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createFundingRequest = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const funding = await prisma.fundingRequest.create({
      data: {
        amount: Number(amount),
        userId: req.user.id,
        reference: "FUND-" + crypto.randomBytes(6).toString("hex").toUpperCase(),
      },
    });
    emitEvent("funding-request-created", {
  message: "New funding request",
  funding,
});

    return res.status(201).json({
      success: true,
      message: "Funding request created successfully",
      funding,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyFundingRequests = async (req, res) => {
  try {
    const requests = await prisma.fundingRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
exports.initializePaystackFunding = async (req, res) => {
  try {
    const result = await walletService.initializePaystackFunding({
      userId: req.user.id,
      email: req.user.email,
      amount: req.body.amount,
    });

    return res.json({
      success: true,
      message: "Paystack payment initialized",
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.verifyPaystackFunding = async (req, res) => {
  try {
    const result = await walletService.verifyPaystackFunding({
      userId: req.user.id,
      reference: req.params.reference,
    });

    return res.json({
      success: true,
      message: "Payment verified successfully",
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
exports.paystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.body)
      .digest("hex");

    const signature = req.headers["x-paystack-signature"];

    if (hash !== signature) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const event = JSON.parse(req.body.toString("utf8"));

    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const amount = event.data.amount;
      const paymentReference = String(event.data.id || reference);

      await walletService.creditWalletFromPaystack({
        reference,
        amount,
        paymentReference,
      });
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Paystack webhook error:", error.message);
    return res.sendStatus(200);
  }
};