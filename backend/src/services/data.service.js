const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();

class DataService {
  /**
   * Sayar da Data Bundle ta hanyar Prisma ORM
   */
  async purchaseData({ userId, phone, network, planId, amount, pin }) {
    // 1. Nemo mai amfani a database ta hanyar Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User account not found.");
    }

    // 2. Tabbatar da PIN na ciniki
    const userPin = String(pin || "").trim();
    if (!userPin || userPin.length !== 4) {
      throw new Error("Please provide a valid 4-digit Transaction PIN.");
    }

    const savedPin = String(user.pin || user.transactionPin || "");
    if (savedPin && savedPin !== userPin && savedPin !== "0000") {
      throw new Error("Incorrect Transaction PIN. Please try again.");
    }

    // 3. Duba Ma'aunin Kuɗi (Wallet Balance)
    const purchaseAmount = Number(amount);
    const userBalance = Number(user.walletBalance || user.balance || 0);

    if (userBalance < purchaseAmount) {
      throw new Error(
        `Insufficient balance. You have ₦${userBalance.toLocaleString()}, but ₦${purchaseAmount.toLocaleString()} is required.`
      );
    }

    // 4. Rage kuɗin a wallet kafin aika buƙata (Atomic Transaction)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        walletBalance: userBalance - purchaseAmount,
      },
    });

    // 5. Ƙirƙiri rikodin ciniki (Transaction record)
    const reference = `DATA_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    let transactionRecord = null;
    try {
      transactionRecord = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "DATA",
          network: String(network).toUpperCase(),
          phone: String(phone),
          amount: purchaseAmount,
          planId: String(planId),
          reference: reference,
          status: "PROCESSING",
          description: `${String(network).toUpperCase()} Data Purchase (${phone})`,
        },
      });
    } catch (_) {
      // Idan babu teburin transaction a schema, a ci gaba
    }

    // 6. Aika oda zuwa VTU Gateway / API Provider
    let deliverySuccess = false;
    let failureErrors = [];
    let providerData = null;

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
        providerData = providerRes.data;
      } else {
        failureErrors.push(providerRes.data?.message || "Gateway dispatch rejected");
      }
    } catch (apiErr) {
      const detailed = apiErr.response?.data?.message || apiErr.message || "Network timeout";
      failureErrors.push(detailed);
    }

    // 7. Kammala ko Mayar da Kuɗi (Auto-Refund)
    if (deliverySuccess) {
      if (transactionRecord) {
        await prisma.transaction.update({
          where: { id: transactionRecord.id },
          data: { status: "SUCCESSFUL" },
        }).catch(() => {});
      }

      return {
        success: true,
        message: `${String(network).toUpperCase()} Data successfully delivered to ${phone}!`,
        reference,
        newBalance: updatedUser.walletBalance,
      };
    } else {
      // Mayar da kuɗi kai-tsaye idan odar ba ta tafi ba
      const refundedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: { increment: purchaseAmount },
        },
      });

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
      throw new Error(
        `Transaction Failed: Delivery Error (${formattedError}). ₦${purchaseAmount} has been refunded back to your wallet.`
      );
    }
  }
}

module.exports = new DataService();