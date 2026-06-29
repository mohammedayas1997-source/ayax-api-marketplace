const prisma = require("../config/prisma");
const crypto = require("crypto");
const { emitEvent } = require("../config/socket");
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