const prisma = require("../config/prisma");

/* ======================================================
   1. GET TIER UPGRADE FEES (PUBLIC / PROTECTED)
   GET /api/v1/settings/tier-fees
====================================================== */
exports.getTierFees = async (req, res) => {
  try {
    const standardSetting = await prisma.systemSetting.findUnique({
      where: { key: "TIER_FEE_STANDARD" },
    });

    const premiumSetting = await prisma.systemSetting.findUnique({
      where: { key: "TIER_FEE_PREMIUM" },
    });

    const fees = {
      STANDARD: standardSetting ? Number(standardSetting.value) : 2500,
      PREMIUM: premiumSetting ? Number(premiumSetting.value) : 5000,
    };

    return res.status(200).json({
      status: "success",
      data: fees,
    });
  } catch (error) {
    console.error("Get tier fees error:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve tier fees.",
    });
  }
};

/* ======================================================
   2. UPDATE TIER UPGRADE FEES (SUPER ADMIN KAWAI)
   POST /api/v1/settings/tier-fees
   Body: { standardFee: 3000, premiumFee: 6000 }
====================================================== */
exports.updateTierFees = async (req, res) => {
  try {
    const { standardFee, premiumFee } = req.body;

    const numStandard = Number(standardFee);
    const numPremium = Number(premiumFee);

    if (!Number.isFinite(numStandard) || numStandard < 0 || !Number.isFinite(numPremium) || numPremium < 0) {
      return res.status(400).json({
        status: "error",
        message: "Fees must be valid non-negative numbers.",
      });
    }

    await prisma.$transaction([
      prisma.systemSetting.upsert({
        where: { key: "TIER_FEE_STANDARD" },
        update: { value: String(numStandard) },
        create: { key: "TIER_FEE_STANDARD", value: String(numStandard) },
      }),
      prisma.systemSetting.upsert({
        where: { key: "TIER_FEE_PREMIUM" },
        update: { value: String(numPremium) },
        create: { key: "TIER_FEE_PREMIUM", value: String(numPremium) },
      }),
    ]);

    return res.status(200).json({
      status: "success",
      message: "Tier upgrade fees updated successfully.",
      data: {
        STANDARD: numStandard,
        PREMIUM: numPremium,
      },
    });
  } catch (error) {
    console.error("Update tier fees error:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to update tier fees.",
    });
  }
};