const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();

const NETWORK_LOOKUP = {
  "1": "MTN",
  "2": "AIRTEL",
  "3": "9MOBILE",
  "4": "GLO",
};

class DataService {
  async purchaseData(params) {
    const { phone, planCode, planId, amount } = params;

    const rawNet = String(params.network || "MTN").toUpperCase().trim();
    const network = NETWORK_LOOKUP[rawNet] || rawNet;
    const targetPlan = String(planCode || planId || "100").trim();

    // 1. Tattara ID ko bayanan mai amfani
    const targetId = params.userId || params.id || params.user?.id || params.user?._id;
    const targetEmail = params.email || params.user?.email;
    const targetPhone = params.userPhone || params.user?.phone;

    let user = null;

    if (targetId) {
      user = await prisma.user.findUnique({ where: { id: targetId } });
    } else if (targetEmail) {
      user = await prisma.user.findUnique({ where: { email: targetEmail } });
    } else if (targetPhone) {
      user = await prisma.user.findFirst({ where: { phone: targetPhone } });
    }

    if (!user) {
      throw new Error("User account not found. Please verify API credentials.");
    }

    // 2. Duba Ma'aunin Kudi
    const purchaseAmount = Number(amount || 0);
    const userBalance = Number(user.walletBalance || user.balance || 0);

    if (purchaseAmount > 0 && userBalance < purchaseAmount) {
      throw new Error(
        `Insufficient balance. You have ₦${userBalance.toLocaleString()}, but ₦${purchaseAmount.toLocaleString()} is required.`
      );
    }

    // 3. Rage kudi a wallet (Atomic Transaction ta amfani da user.id)
    if (purchaseAmount > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          walletBalance: { decrement: purchaseAmount },
        },
      });
    }

    // 4. Kirkiri rikodin ciniki
    const reference = params.reference || `DATA_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    let transactionRecord = null;
    try {
      transactionRecord = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "DATA",
          network,
          phone: String(phone),
          amount: purchaseAmount,
          planId: targetPlan,
          reference,
          status: "PROCESSING",
          description: `${network} Data Purchase (${phone})`,
        },
      });
    } catch (_) {}

    // 5. Aika oda zuwa Gateway / Provider
    let deliverySuccess = false;
    let failureErrors = [];
    let providerData = null;

    try {
      const primaryApiUrl = process.env.VTU_API_URL || "https://api.gateway.com/data";
      const primaryApiKey = process.env.VTU_API_KEY || process.env.DATA_API_KEY;

      const providerRes = await axios.post(
        primaryApiUrl,
        {
          network,
          mobile_number: phone,
          plan: targetPlan,
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
        providerData = providerRes.data;
      } else {
        failureErrors.push(providerRes.data?.message || "Gateway dispatch rejected");
      }
    } catch (apiErr) {
      const detailed = apiErr.response?.data?.message || apiErr.message || "Network timeout";
      failureErrors.push(detailed);
    }

    // 6. Tabbatar da Nasara ko Mayar da Kudi (Refund)
    if (deliverySuccess) {
      if (transactionRecord) {
        await prisma.transaction.update({
          where: { id: transactionRecord.id },
          data: { status: "SUCCESSFUL" },
        }).catch(() => {});
      }

      return {
        success: true,
        message: `${network} Data successfully delivered to ${phone}!`,
        reference,
        newBalance: userBalance - purchaseAmount,
      };
    } else {
      if (purchaseAmount > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { walletBalance: { increment: purchaseAmount } },
        });
      }

      if (transactionRecord) {
        await prisma.transaction.update({
          where: { id: transactionRecord.id },
          data: {
            status: "FAILED",
            description: `Refunded: ${failureErrors.join(" | ")}`,
          },
        }).catch(() => {});
      }

      const formattedError = failureErrors.length > 0 ? failureErrors.join("; ") : "Provider unavailable";
      throw new Error(`Transaction Failed: ${formattedError}`);
    }
  }
}

module.exports = new DataService();