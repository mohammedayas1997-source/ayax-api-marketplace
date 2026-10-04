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

    // 1. Tattara ID ko bayanan mai amfani ta kowace hanya (Session ko API Key)
    const targetId =
      params.userId ||
      params.id ||
      params.user?.id ||
      params.user?._id ||
      params.apiKeyUser?.id ||
      params.apiKeyUser?.userId;
    const targetEmail = params.email || params.user?.email || params.apiKeyUser?.email;
    const targetPhone = params.userPhone || params.user?.phone || params.apiKeyUser?.phone;

    let user = null;

    if (targetId) {
      user = await prisma.user.findUnique({
        where: { id: targetId },
        include: { wallet: true },
      });
    } else if (targetEmail) {
      user = await prisma.user.findUnique({
        where: { email: targetEmail },
        include: { wallet: true },
      });
    } else if (targetPhone) {
      user = await prisma.user.findFirst({
        where: { phone: targetPhone },
        include: { wallet: true },
      });
    }

    if (!user) {
      throw new Error("User session expired or user account not found. Please log in again.");
    }

    // 2. Duba Ma'aunin Kuɗi (Wallet Balance) - Daga Wallet table ko User table
    let userWalletRecord = user.wallet || null;
    if (!userWalletRecord && prisma.wallet) {
      try {
        userWalletRecord = await prisma.wallet.findUnique({
          where: { userId: user.id },
        });
      } catch (_) {}
    }

    const purchaseAmount = Number(amount);

    // Bincika ko kudin yana cikin Wallet table ko User table
    const walletBalanceNum = userWalletRecord ? Number(userWalletRecord.balance || 0) : 0;
    const userBalanceNum = Number(user.walletBalance || user.balance || 0);
    const availableBalance = walletBalanceNum > 0 ? walletBalanceNum : userBalanceNum;

    if (availableBalance < purchaseAmount) {
      throw new Error(
        `Insufficient balance. You have ₦${availableBalance.toLocaleString()}, but ₦${purchaseAmount.toLocaleString()} is required.`
      );
    }

    // 3. Rage kuɗin a wallet kafin aika buƙata (Atomic Transaction)
    const isWalletTableActive = Boolean(userWalletRecord);

    await prisma.$transaction(async (tx) => {
      if (isWalletTableActive && tx.wallet) {
        await tx.wallet.update({
          where: { userId: user.id },
          data: { balance: { decrement: purchaseAmount } },
        });
      }
      if (tx.user) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            walletBalance: { decrement: purchaseAmount },
          },
        }).catch(() => {});
      }
    });

    // 4. Ƙirƙiri rikodin ciniki (Transaction record)
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

    // 5. Aika oda zuwa AutoSyncNG API Provider
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

    // 6. Kammala ko Mayar da Kuɗi (Auto-Refund)
    if (deliverySuccess) {
      if (transactionRecord) {
        await prisma.transaction.update({
          where: { id: transactionRecord.id },
          data: { status: "SUCCESSFUL" },
        }).catch(() => {});
      }

      const finalBalance = availableBalance - purchaseAmount;
      return {
        success: true,
        message: `${String(network).toUpperCase()} Data successfully delivered to ${phone}!`,
        reference,
        newBalance: finalBalance,
        data: providerData,
      };
    } else {
      // Mayar da kuɗi kai-tsaye idan odar ba ta tafi ba (Refund)
      await prisma.$transaction(async (tx) => {
        if (isWalletTableActive && tx.wallet) {
          await tx.wallet.update({
            where: { userId: user.id },
            data: { balance: { increment: purchaseAmount } },
          });
        }
        if (tx.user) {
          await tx.user.update({
            where: { id: user.id },
            data: { walletBalance: { increment: purchaseAmount } },
          }).catch(() => {});
        }
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