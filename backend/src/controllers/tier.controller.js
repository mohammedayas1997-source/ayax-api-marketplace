const prisma = require("../config/prisma");
const axios = require("axios");
const { emitEvent } = require("../config/socket");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

const ALLOWED_TIERS = [
  "REGULAR",
  "STANDARD",
  "PREMIUM",
  "AGENT",
  "DEVELOPER",
];

// Helper to fetch dynamic tier fees configured by the administrator
async function getDynamicTierFees() {
  try {
    const [standardSetting, premiumSetting, agentSetting, devSetting] = await Promise.all([
      prisma.systemSetting.findUnique({
        where: { key: "TIER_FEE_STANDARD" },
      }),
      prisma.systemSetting.findUnique({
        where: { key: "TIER_FEE_PREMIUM" },
      }),
      prisma.systemSetting.findUnique({
        where: { key: "TIER_FEE_AGENT" },
      }),
      prisma.systemSetting.findUnique({
        where: { key: "TIER_FEE_DEVELOPER" },
      }),
    ]);

    return {
      REGULAR: 0,
      STANDARD: standardSetting ? Number(standardSetting.value) : 2500,
      PREMIUM: premiumSetting ? Number(premiumSetting.value) : 5000,
      AGENT: agentSetting ? Number(agentSetting.value) : 3500,
      DEVELOPER: devSetting ? Number(devSetting.value) : 7500,
    };
  } catch (err) {
    console.error("Failed to read dynamic tier settings, using default fallback:", err.message);
    return {
      REGULAR: 0,
      STANDARD: 2500,
      PREMIUM: 5000,
      AGENT: 3500,
      DEVELOPER: 7500,
    };
  }
}

/* ======================================================
   1. GET TIER PLANS
   GET /api/v1/tiers/plans
====================================================== */
exports.getTierPlans = async (req, res) => {
  try {
    const user = req.user;
    const currentTier = String(user?.tier || "REGULAR").toUpperCase();

    const tierFees = await getDynamicTierFees();

    const plans = [
      {
        tier: "REGULAR",
        name: "Regular Customer",
        fee: 0,
        isCurrent: currentTier === "REGULAR",
        features: [
          "Standard Retail Rates",
          "Web & Mobile App Access",
          "Basic Verification (NIN & BVN)",
          "Standard Helpdesk Support",
        ],
      },
      {
        tier: "STANDARD",
        name: "Standard Reseller",
        fee: tierFees.STANDARD,
        isCurrent: currentTier === "STANDARD",
        features: [
          "Discounted Data Plans (SME, CG, Gifting)",
          "Higher API Concurrency",
          "Priority GSM Modem Queuing",
          "Standard Slip Printing & Verification Logs",
        ],
      },
      {
        tier: "PREMIUM",
        name: "Premium Enterprise",
        fee: tierFees.PREMIUM,
        isCurrent: currentTier === "PREMIUM",
        features: [
          "Lowest Wholesale Rates Across All Services",
          "Discounted NIN & Identity Lookup Fees",
          "Premium Plastic / PVC Slip Formatting",
          "Dedicated 24/7 Account Management",
          "Unlimited Daily API Limits",
        ],
      },
      {
        tier: "DEVELOPER",
        name: "Developer API Gateway",
        fee: tierFees.DEVELOPER,
        isCurrent: currentTier === "DEVELOPER",
        features: [
          "Direct Developer Webhooks & Sandbox Mode",
          "Dedicated GSM SIM Modem Routing",
          "Highest Concurrency & Raw JSON Endpoints",
          "Custom Automated Error Fallbacks",
        ],
      },
    ];

    return res.status(200).json({
      status: "success",
      currentTier,
      data: plans,
    });
  } catch (error) {
    console.error("Get tier plans error:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve tier plans.",
    });
  }
};

/* ======================================================
   2. UPGRADE TIER VIA WALLET BALANCE (INSTANT ACTIVATION)
   POST /api/v1/tiers/upgrade/wallet
   Body: { targetTier: "STANDARD" | "PREMIUM" | "DEVELOPER" }
====================================================== */
exports.upgradeTierViaWallet = async (req, res) => {
  try {
    const user = req.user;
    const { targetTier } = req.body;

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication is required to perform tier upgrade.",
      });
    }

    const normalizedTier = String(targetTier || "").toUpperCase().trim();
    const currentTier = String(user.tier || "REGULAR").toUpperCase();

    if (!ALLOWED_TIERS.includes(normalizedTier) || normalizedTier === "REGULAR") {
      return res.status(400).json({
        status: "error",
        message: "Invalid target tier specified for upgrade.",
      });
    }

    if (currentTier === normalizedTier) {
      return res.status(400).json({
        status: "error",
        message: `Your account is already on the ${normalizedTier} tier.`,
      });
    }

    const tierFees = await getDynamicTierFees();
    const cost = Number(tierFees[normalizedTier] || 0);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_FUNDS",
        message: `Insufficient wallet balance to upgrade to ${normalizedTier}. Required: ₦${cost}.`,
        currentBalance: wallet ? Number(wallet.balance) : 0,
        requiredAmount: cost,
      });
    }

    const reference = `TIER_WALLET_${normalizedTier}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore - cost;

    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: balanceAfter },
      });

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { tier: normalizedTier },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEBIT",
          service: "TIER_UPGRADE",
          amount: cost,
          status: "SUCCESSFUL",
          reference,
          description: `Instant wallet upgrade to ${normalizedTier} Tier`,
        },
      });

      if (tx.walletLedger) {
        await tx.walletLedger.create({
          data: {
            userId: user.id,
            reference,
            type: "DEBIT",
            amount: cost,
            balanceBefore,
            balanceAfter,
            module: "TIER_UPGRADE",
            description: `Account upgraded to ${normalizedTier} Tier`,
          },
        });
      }

      return { updatedUser, updatedWallet, transaction };
    });

    emitEvent("wallet-updated", {
      userId: user.id,
      wallet: result.updatedWallet,
    });

    emitEvent("tier-upgraded", {
      userId: user.id,
      tier: normalizedTier,
    });

    return res.status(200).json({
      status: "success",
      message: `Congratulations! Your account has been upgraded to ${normalizedTier} Tier.`,
      reference,
      newTier: normalizedTier,
      walletBalance: result.updatedWallet.balance,
    });
  } catch (error) {
    console.error("Wallet tier upgrade error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Unable to process wallet tier upgrade.",
    });
  }
};

/* ======================================================
   3. INITIALIZE PAYSTACK UPGRADE
   POST /api/v1/tiers/paystack/initialize
   Body: { targetTier: "STANDARD" | "PREMIUM" | "DEVELOPER" }
====================================================== */
exports.initializeTierPaystack = async (req, res) => {
  try {
    const user = req.user;
    const { targetTier } = req.body;

    const normalizedTier = String(targetTier || "").toUpperCase().trim();
    const currentTier = String(user.tier || "REGULAR").toUpperCase();

    if (!ALLOWED_TIERS.includes(normalizedTier) || normalizedTier === "REGULAR") {
      return res.status(400).json({
        status: "error",
        message: "Invalid target tier. Choose STANDARD, PREMIUM, or DEVELOPER.",
      });
    }

    if (currentTier === normalizedTier) {
      return res.status(400).json({
        status: "error",
        message: `You are already on the ${normalizedTier} tier.`,
      });
    }

    const tierFees = await getDynamicTierFees();
    const fee = tierFees[normalizedTier];

    if (!fee || fee <= 0) {
      return res.status(400).json({
        status: "error",
        message: "No fee configured for this tier.",
      });
    }

    const amountInKobo = Math.round(fee * 100);
    const reference = `TIER_${normalizedTier}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const callbackUrl = `${process.env.FRONTEND_URL || "https://ayaxdata.online"}/dashboard/upgrade?reference=${reference}`;

    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user.email,
        amount: amountInKobo,
        reference,
        callback_url: callbackUrl,
        metadata: {
          userId: user.id,
          targetTier: normalizedTier,
          service: "TIER_UPGRADE",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Paystack authorization initialized.",
      authorizationUrl: paystackRes.data.data.authorization_url,
      accessCode: paystackRes.data.data.access_code,
      reference,
      fee,
    });
  } catch (error) {
    console.error("Paystack Tier Init Error:", error.response?.data || error.message);
    return res.status(500).json({
      status: "error",
      message: error.response?.data?.message || "Unable to initialize Paystack payment. Please try again.",
    });
  }
};

/* ======================================================
   4. VERIFY PAYSTACK PAYMENT & APPLY UPGRADE
   GET /api/v1/tiers/paystack/verify/:reference
====================================================== */
exports.verifyTierPaystack = async (req, res) => {
  try {
    const { reference } = req.params;

    // 1. Check if reference has already been executed
    const existingTx = await prisma.transaction.findUnique({
      where: { reference },
    });

    if (existingTx && existingTx.status === "SUCCESSFUL") {
      return res.status(200).json({
        status: "success",
        message: "This tier subscription has already been activated.",
        transaction: existingTx,
      });
    }

    // 2. Query Paystack Verification Endpoint
    const paystackRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
        timeout: 30000,
      }
    );

    const paymentData = paystackRes.data?.data;

    if (!paymentData || paymentData.status !== "success") {
      return res.status(400).json({
        status: "error",
        message: "Payment verification failed or payment was not completed on Paystack.",
      });
    }

    const targetTier = String(paymentData.metadata?.targetTier || "").toUpperCase();
    const userId = paymentData.metadata?.userId || req.user?.id;
    const amountPaid = paymentData.amount / 100;

    if (!targetTier || !ALLOWED_TIERS.includes(targetTier)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid tier metadata in payment record.",
      });
    }

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "Unable to identify target user for tier activation.",
      });
    }

    // 3. Atomically Upgrade User Tier & Save Transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { tier: targetTier },
      });

      await tx.transaction.upsert({
        where: { reference },
        update: {
          status: "SUCCESSFUL",
          description: `Direct Paystack upgrade to ${targetTier} Tier (NGN ${amountPaid})`,
        },
        create: {
          userId,
          type: "CREDIT",
          service: "TIER_UPGRADE",
          amount: amountPaid,
          status: "SUCCESSFUL",
          reference,
          description: `Direct Paystack upgrade to ${targetTier} Tier (NGN ${amountPaid})`,
        },
      });
    });

    emitEvent("tier-upgraded", {
      userId,
      tier: targetTier,
    });

    return res.status(200).json({
      status: "success",
      message: `Payment confirmed! Your account has been upgraded to ${targetTier} Tier.`,
      newTier: targetTier,
      reference,
    });
  } catch (error) {
    console.error("Tier verification error:", error.response?.data || error.message);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while verifying the payment.",
    });
  }
};