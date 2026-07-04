const prisma = require("../config/prisma");
const crypto = require("crypto");
const { emitEvent } = require("../config/socket");

exports.buyAirtime = async (req, res) => {
  try {
    const userId = req.user.id;
    const { network, phone, amount } = req.body;

    if (!network || !phone || !amount) {
      return res.status(400).json({
        success: false,
        message: "Network, phone and amount are required",
      });
    }

    const value = Number(amount);

    if (value < 50) {
      return res.status(400).json({
        success: false,
        message: "Minimum airtime amount is ₦50",
      });
    }

    const reference =
      "AIRTIME-" + crypto.randomBytes(8).toString("hex").toUpperCase();

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      if (wallet.balance < value) {
        throw new Error("Insufficient wallet balance");
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - value;

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          reference,
          type: "DEBIT",
          amount: value,
          status: "PROCESSING",
          service: "AIRTIME",
          description: `${network} airtime purchase for ${phone}`,
        },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          reference,
          type: "DEBIT",
          amount: value,
          balanceBefore,
          balanceAfter,
          module: "AIRTIME",
          description: `${network} airtime purchase for ${phone}`,
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
      };
    });

    emitEvent("wallet-updated", {
      userId,
      wallet: result.wallet,
    });

    emitEvent("purchase-successful", {
      userId,
      transaction: result.transaction,
    });

    return res.status(201).json({
      success: true,
      message: "Airtime purchase created successfully",
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};