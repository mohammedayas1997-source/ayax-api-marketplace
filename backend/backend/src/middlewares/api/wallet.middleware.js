const prisma = require("../../config/prisma");

module.exports = (minimumAmount = 0) => {
  return async (req, res, next) => {
    try {
      if (!req.developer) {
        return res.status(401).json({
          success: false,
          code: "DEVELOPER_NOT_FOUND",
          message: "Developer account not found on request.",
        });
      }

      let wallet = req.developer.wallet;

      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: {
            userId: req.developer.id,
            balance: 0,
          },
        });
      }

      if (Number(wallet.balance) < Number(minimumAmount)) {
        return res.status(402).json({
          success: false,
          code: "INSUFFICIENT_WALLET_BALANCE",
          message: "Insufficient wallet balance.",
          requiredAmount: Number(minimumAmount),
          currentBalance: Number(wallet.balance),
        });
      }

      req.wallet = wallet;
      req.minimumAmount = Number(minimumAmount);

      next();
    } catch (error) {
      console.error("Wallet Middleware Error:", error.message);

      return res.status(500).json({
        success: false,
        code: "WALLET_CHECK_ERROR",
        message: "Unable to verify wallet balance.",
      });
    }
  };
};