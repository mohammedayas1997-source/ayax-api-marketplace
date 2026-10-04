const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const autoSyncService = require("./autosync.service");

const prisma = new PrismaClient();

class DataService {
  /**
   * Sayar da Data Bundle ta hanyar Prisma ORM tare da AutoSyncNG Gateway
   */
  async purchaseData(params) {
    const { phone, network, planId, amount, pin } = params;

    // 1. Tattara ID ko bayanan mai amfani ta kowace hanya
    const targetId = params.userId || params.id || params.user?.id || params.user?._id;
    const targetEmail = params.email || params.user?.email;
    const targetPhone = params.userPhone || params.user?.phone;

    let user = null;

    if (targetId) {
      user = await prisma.user.findUnique({
        where: { id: targetId },
      });
    } else if (targetEmail) {
      user = await prisma.user.findUnique({
        where: { email: targetEmail },
      });
    } else if (targetPhone) {
      user = await prisma.user.findFirst({
        where: { phone: targetPhone },
      });
    }

    if (!user) {
      throw new Error("User session expired or user account not found. Please log in again.");
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
      where: { id: user.id },
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

    // 6. Aika oda zuwa AutoSyncNG API Provider
    let deliverySuccess = false;
    let failureErrors = [];
    let providerData = null;

    try {
      const autoSyncRes = await autoSyncService.purchaseData({
        phone: String(phone),
        network: String(network).toUpperCase(),
        planCode: String(planId),
        amount: purchaseAmount,
        reference: reference,
      });

      if (autoSyncRes.success) {
        deliverySuccess = true;
        providerData = autoSyncRes.data;
      } else {
        failureErrors.push(autoSyncRes.message || "AutoSyncNG dispatch rejected");
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
        data: providerData,
      };
    } else {
      // Mayar da kuɗi kai-tsaye idan odar ba ta tafi ba
      const refundedUser = await prisma.user.update({
        where: { id: user.id },
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