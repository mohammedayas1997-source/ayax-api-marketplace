const prisma = require("../config/prisma");
const axios = require("axios");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

const TIER_UPGRADE_FEES = {
  STANDARD: 2500, // ₦2,500
  PREMIUM: 5000,  // ₦5,000
};

/* ======================================================
   1. GET TIER PLANS
   GET /api/v1/tiers/plans
====================================================== */
exports.getTierPlans = async (req, res) => {
  try {
    const user = req.user;
    const currentTier = user?.tier || "REGULAR";

    const plans = [
      {
        tier: "REGULAR",
        name: "Regular Developer",
        fee: 0,
        isCurrent: currentTier === "REGULAR",
        features: [
          "Standard Retail Rates",
          "Public API Access",
          "Basic Verification (NIN & BVN)",
          "Community Support",
        ],
      },
      {
        tier: "STANDARD",
        name: "Standard Reseller",
        fee: TIER_UPGRADE_FEES.STANDARD,
        isCurrent: currentTier === "STANDARD",
        features: [
          "Discounted Data Plans (SME, CG, Gifting)",
          "Higher API Concurrency",
          "Priority GSM Modem Queuing",
          "Standard Slip Printing",
        ],
      },
      {
        tier: "PREMIUM",
        name: "Premium Enterprise",
        fee: TIER_UPGRADE_FEES.PREMIUM,
        isCurrent: currentTier === "PREMIUM",
        features: [
          "Lowest Wholesale Rates Across All Services",
          "Discounted NIN Validation Issues",
          "Premium Plastic / PVC Slip Generation",
          "Dedicated 24/7 API Support",
          "Unlimited Daily API Limits",
        ],
      },
    ];

    return res.status(200).json({
      status: "success",
      currentTier,
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve tier plans.",
    });
  }
};

/* ======================================================
   2. INITIALIZE PAYSTACK UPGRADE
   POST /api/v1/tiers/paystack/initialize
   Body: { targetTier: "STANDARD" | "PREMIUM" }
====================================================== */
exports.initializeTierPaystack = async (req, res) => {
  try {
    const user = req.user;
    const { targetTier } = req.body;

    const normalizedTier = String(targetTier || "").toUpperCase().trim();
    const currentTier = String(user.tier || "REGULAR").toUpperCase();

    if (!["STANDARD", "PREMIUM"].includes(normalizedTier)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid target tier. Choose STANDARD or PREMIUM.",
      });
    }

    if (currentTier === normalizedTier) {
      return res.status(400).json({
        status: "error",
        message: `You are already on the ${normalizedTier} tier.`,
      });
    }

    const fee = TIER_UPGRADE_FEES[normalizedTier];
    const amountInKobo = fee * 100;
    const reference = `TIER_${normalizedTier}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const callbackUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/upgrade?reference=${reference}`;

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
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Paystack authorization initialized.",
      authorizationUrl: paystackRes.data.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error("Paystack Tier Init Error:", error.response?.data || error.message);
    return res.status(500).json({
      status: "error",
      message: "Unable to initialize Paystack payment. Please try again.",
    });
  }
};

/* ======================================================
   3. VERIFY PAYSTACK PAYMENT & APPLY UPGRADE
   GET /api/v1/tiers/paystack/verify/:reference
====================================================== */
exports.verifyTierPaystack = async (req, res) => {
  try {
    const user = req.user;
    const { reference } = req.params;

    // Tabbatar ko an riga an yi processing wannan reference din
    const existingTx = await prisma.transaction.findUnique({
      where: { reference },
    });

    if (existingTx && existingTx.status === "SUCCESSFUL") {
      return res.status(200).json({
        status: "success",
        message: "This tier subscription has already been activated.",
      });
    }

    // Kira Paystack Verification API
    const paystackRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    const paymentData = paystackRes.data?.data;

    if (!paymentData || paymentData.status !== "success") {
      return res.status(400).json({
        status: "error",
        message: "Payment verification failed or was not completed on Paystack.",
      });
    }

    const targetTier = paymentData.metadata?.targetTier;
    const amountPaid = paymentData.amount / 100;

    if (!targetTier || !TIER_UPGRADE_FEES[targetTier]) {
      return res.status(400).json({
        status: "error",
        message: "Invalid tier metadata in payment record.",
      });
    }

    // Sabunta matsayin User a database tare da ajiye Transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { tier: targetTier },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "CREDIT",
          service: "TIER_UPGRADE",
          amount: amountPaid,
          status: "SUCCESSFUL",
          reference,
          description: `Direct Paystack upgrade to ${targetTier} Tier (NGN ${amountPaid})`,
        },
      });
    });

    return res.status(200).json({
      status: "success",
      message: `Payment confirmed! Your account has been upgraded to ${targetTier}.`,
      newTier: targetTier,
    });
  } catch (error) {
    console.error("Tier verification error:", error.response?.data || error.message);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while verifying the payment.",
    });
  }
};