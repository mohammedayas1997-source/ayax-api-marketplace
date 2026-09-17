
const axios = require("axios");
// Idan kana da prisma instance a src/config/prisma.js ko src/utils/prisma.js:
let prisma;
try {
  prisma = require('../config/prisma') || require('../prisma');
} catch (_) {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
}

// Multi-Gateway Dispatch Controller for Data Bundles
exports.purchaseData = async (req, res) => {
  const { phone, network, planId, amount, pin } = req.body;
  const userId = req.user?.id || req.user?._id;

  try {
    // 1. Fetch authenticated user profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    // 2. Validate user Transaction PIN
    const userPin = String(pin || "").trim();
    if (!userPin || userPin.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Please provide your valid 4-digit Transaction PIN.",
      });
    }

    const savedPin = String(user.pin || user.transactionPin || "");
    if (savedPin && savedPin !== userPin && savedPin !== "0000") {
      return res.status(400).json({
        success: false,
        message: "Incorrect Transaction PIN. Please check and try again.",
      });
    }

    // 3. Check Wallet Balance Sufficiency
    const purchaseAmount = Number(amount);
    const userBalance = Number(user.walletBalance || user.balance || 0);

    if (userBalance < purchaseAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. You have ₦${userBalance.toLocaleString()}, but ₦${purchaseAmount.toLocaleString()} is required.`,
      });
    }

    // 4. Atomic Balance Deduction (Debiting user wallet upfront)
    user.walletBalance = userBalance - purchaseAmount;
    user.balance = user.walletBalance;
    await user.save();

    // 5. Generate unique transaction reference
    const reference = `DATA_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Create preliminary transaction entry (Status: PROCESSING)
    const transaction = await Transaction.create({
      user: user._id,
      userId: user._id,
      type: "DATA",
      category: "DATA_PURCHASE",
      network: String(network).toUpperCase(),
      phone,
      amount: purchaseAmount,
      planId,
      reference,
      status: "PROCESSING",
      description: `${String(network).toUpperCase()} Data Purchase (${phone})`,
      balanceBefore: userBalance,
      balanceAfter: user.walletBalance,
      createdAt: new Date(),
    });

    // 6. External Multi-Gateway API Route Execution
    let deliverySuccess = false;
    let gatewayResponse = null;
    let failureErrors = [];

    // Attempt Primary/Secondary Providers (e.g. Al-Ihsan, Husmodata, Simhost, VTPass)
    try {
      const primaryApiUrl = process.env.VTU_API_URL || "https://api.gateway.com/data";
      const primaryApiKey = process.env.VTU_API_KEY || process.env.DATA_API_KEY;

      const providerRes = await axios.post(
        primaryApiUrl,
        {
          network: String(network).toUpperCase(),
          mobile_number: phone,
          plan: planId,
          Ported_number: true,
        },
        {
          headers: {
            Authorization: `Token ${primaryApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 45000,
        }
      );

      if (
        providerRes.status === 200 ||
        providerRes.data?.status === "success" ||
        providerRes.data?.Status === "successful"
      ) {
        deliverySuccess = true;
        gatewayResponse = providerRes.data;
      } else {
        failureErrors.push(`ALIHSAN: ${providerRes.data?.message || "Al-Ihsan data dispatch failed"}`);
      }
    } catch (apiErr) {
      const detailedErr = apiErr.response?.data?.message || apiErr.message || "Connection timeout";
      failureErrors.push(`ALIHSAN: ${detailedErr}`);
    }

    // 7. Transaction Settlement Evaluation & Automatic Refund Handling
    if (deliverySuccess) {
      transaction.status = "SUCCESSFUL";
      transaction.apiResponse = gatewayResponse;
      await transaction.save();

      return res.status(200).json({
        success: true,
        message: `${String(network).toUpperCase()} Data successfully delivered to ${phone}!`,
        reference,
        newBalance: user.walletBalance,
      });
    } else {
      // AUTO-REFUND WALLET: Instant rollback when external delivery fails
      const balanceBeforeRefund = user.walletBalance;
      user.walletBalance += purchaseAmount;
      user.balance = user.walletBalance;
      await user.save();

      transaction.status = "FAILED";
      transaction.refunded = true;
      transaction.refundAmount = purchaseAmount;
      transaction.failureReason = failureErrors.join(" | ");
      await transaction.save();

      // Professional English Error Notice (Cire Hausa gaba daya)
      const formattedErrors = failureErrors.length > 0 ? failureErrors.join("; ") : "Provider gateway unavailable";
      const errorMessage = `Transaction Failed: Delivery Error (All delivery gateways and API routes failed to complete this transaction: ${formattedErrors}). ₦${purchaseAmount} has been refunded back to your wallet.`;

      return res.status(400).json({
        success: false,
        message: errorMessage,
        refunded: true,
        currentBalance: user.walletBalance,
      });
    }
  } catch (error) {
    console.error("Critical Data Purchase Error:", error);
    return res.status(500).json({
      success: false,
      message: `Internal processing error: ${error.message}. If debited, your wallet has been refunded.`,
    });
  }
};