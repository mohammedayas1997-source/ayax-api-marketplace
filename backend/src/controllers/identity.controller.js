const prisma = require("../config/prisma");
const abjiktech = require("../services/abjiktech.service");

/* ======================================================
   HELPER FUNCTIONS (WALLET RESOLUTION, CHARGE & REFUND)
====================================================== */

// Helper don gano asalin User ID da Wallet ko ta API Key ne ko Session
async function resolveUserWallet(user) {
  if (!user) return null;

  const candidateIds = [
    user.id,
    user._id,
    user.userId,
    user.accountId,
    user.user?.id,
    user.apiKeyUser?.id,
  ].filter(Boolean);

  let wallet = null;
  let validUserId = null;

  for (const id of candidateIds) {
    try {
      wallet = await prisma.wallet.findFirst({
        where: {
          OR: [
            { userId: String(id) },
            { id: String(id) },
          ],
        },
      });
      if (wallet) {
        validUserId = wallet.userId || id;
        break;
      }
    } catch (_) {}
  }

  // Idan ba a samu ta ID ba, duba email
  if (!wallet && user.email) {
    try {
      const dbUser = await prisma.user.findFirst({
        where: { email: user.email },
        include: { wallet: true },
      });
      if (dbUser?.wallet) {
        wallet = dbUser.wallet;
        validUserId = dbUser.id;
      }
    } catch (_) {}
  }

  return { wallet, userId: validUserId || user.id };
}

// Cire kudi a wallet da ajiye pending/processing transaction
async function chargeWallet({ user, cost, service, description, reference }) {
  const { wallet, userId } = await resolveUserWallet(user);

  if (!wallet) {
    const err = new Error("User billing wallet account could not be found. Check API credentials.");
    err.statusCode = 404;
    err.code = "WALLET_NOT_FOUND";
    throw err;
  }

  const currentBalance = Number(wallet.balance ?? 0);

  if (currentBalance < Number(cost)) {
    const err = new Error(
      `Insufficient wallet balance. NGN ${cost} is required, but available balance is NGN ${currentBalance}.`
    );
    err.statusCode = 402;
    err.code = "INSUFFICIENT_BALANCE";
    throw err;
  }

  const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: cost } },
    });

    const t = await tx.transaction.create({
      data: {
        userId: String(userId),
        type: "DEBIT",
        service,
        amount: cost,
        status: "PROCESSING",
        reference,
        description,
      },
    });

    return { updatedWallet: w, transaction: t };
  });

  return { updatedWallet, transaction, userId };
}

// Mayar da kudi ga wallet nan take idan upstream ya bada kuskure
async function refundTransaction({ userId, cost, transactionId, reason }) {
  try {
    await prisma.$transaction(async (tx) => {
      // Nemo wallet don maida kudin
      const targetWallet = await tx.wallet.findFirst({
        where: {
          OR: [{ userId: String(userId) }, { id: String(userId) }],
        },
      });

      if (targetWallet) {
        await tx.wallet.update({
          where: { id: targetWallet.id },
          data: { balance: { increment: Number(cost) } },
        });
      }

      if (transactionId) {
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: "FAILED", description: `FAILED & REFUNDED: ${reason}` },
        });
      }
    });
  } catch (err) {
    console.error("Refund processing failed:", err.message);
  }
}

/* ======================================================
   1. NIN VERIFICATION (BY 11-DIGIT NIN)
   POST /api/v1/identity/nin/verify
====================================================== */
exports.verifyNin = async (req, res) => {
  let chargedTransaction = null;
  let chargedUserId = null;
  let chargedCost = 0;

  try {
    const user = req.user || req.apiKeyUser;
    const { nin, slipType = "Standard Slip", reference } = req.body;

    const cleanNin = String(nin || "").trim();
    if (!cleanNin || cleanNin.length !== 11) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "A valid 11-digit National Identity Number (NIN) is required.",
      });
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    let pricing = null;
    try {
      pricing = await prisma.servicePricing.findFirst({
        where: {
          category: "IDENTITY",
          enabled: true,
          tier: userTier,
          OR: [
            { serviceCode: "NIN_VERIFY" },
            { serviceCode: { contains: "NIN" } },
          ],
        },
      });
    } catch (_) {}

    const cost = Number(pricing?.sellingPrice || 100);
    chargedCost = cost;
    const txRef = reference || `AYAX_NIN_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction, userId } = await chargeWallet({
      user,
      cost,
      service: "NIN VERIFICATION",
      description: `NIN Verification for [${cleanNin}] (${slipType})`,
      reference: txRef,
    });

    chargedTransaction = transaction;
    chargedUserId = userId;

    const result = await abjiktech.verifyNIN(cleanNin, slipType);

    if (!result || !result.success) {
      const failureReason = result?.message || "Gateway response failed";
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: failureReason,
      });

      return res.status(502).json({
        status: "error",
        code: "GATEWAY_ERROR",
        message: failureReason,
      });
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCESSFUL" },
    });

    return res.status(200).json({
      status: "success",
      code: "VERIFICATION_SUCCESSFUL",
      message: "NIN verified successfully.",
      data: {
        reference: txRef,
        nin: cleanNin,
        slipType,
        details: result.data || result,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    if (chargedTransaction && chargedUserId) {
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: error.message,
      });
    }

    console.error("NIN Verification error:", error.message);
    return res.status(error.statusCode || 500).json({
      status: "error",
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "An error occurred during NIN verification.",
    });
  }
};

/* ======================================================
   2. NIN VERIFICATION (BY PHONE NUMBER)
   POST /api/v1/identity/nin/verify-phone
====================================================== */
exports.verifyNinByPhone = async (req, res) => {
  let chargedTransaction = null;
  let chargedUserId = null;
  let chargedCost = 0;

  try {
    const user = req.user || req.apiKeyUser;
    const { phone, slipType = "Standard Slip", reference } = req.body;

    const cleanPhone = String(phone || "").trim();
    if (!cleanPhone || cleanPhone.length < 11) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "A valid 11-digit mobile phone number is required.",
      });
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    let pricing = null;
    try {
      pricing = await prisma.servicePricing.findFirst({
        where: {
          category: "IDENTITY",
          enabled: true,
          tier: userTier,
          OR: [
            { serviceCode: "NIN_PHONE_VERIFY" },
            { serviceCode: "NIN_VERIFY" },
          ],
        },
      });
    } catch (_) {}

    const cost = Number(pricing?.sellingPrice || 100);
    chargedCost = cost;
    const txRef = reference || `AYAX_PHN_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction, userId } = await chargeWallet({
      user,
      cost,
      service: "NIN PHONE VERIFICATION",
      description: `NIN Phone Verification for [${cleanPhone}] (${slipType})`,
      reference: txRef,
    });

    chargedTransaction = transaction;
    chargedUserId = userId;

    const result = await abjiktech.verifyNINByPhone(cleanPhone, slipType);

    if (!result || !result.success) {
      const failureReason = result?.message || "Phone lookup failed";
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: failureReason,
      });

      return res.status(502).json({
        status: "error",
        code: "GATEWAY_ERROR",
        message: failureReason,
      });
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCESSFUL" },
    });

    return res.status(200).json({
      status: "success",
      code: "VERIFICATION_SUCCESSFUL",
      message: "NIN phone lookup completed successfully.",
      data: {
        reference: txRef,
        phone: cleanPhone,
        slipType,
        details: result.data || result,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    if (chargedTransaction && chargedUserId) {
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: error.message,
      });
    }

    console.error("NIN Phone Verification error:", error.message);
    return res.status(error.statusCode || 500).json({
      status: "error",
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "An error occurred during phone verification.",
    });
  }
};

/* ======================================================
   3. BVN VERIFICATION
   POST /api/v1/identity/bvn/verify
====================================================== */
exports.verifyBvn = async (req, res) => {
  let chargedTransaction = null;
  let chargedUserId = null;
  let chargedCost = 0;

  try {
    const user = req.user || req.apiKeyUser;
    const { bvn, slipType = "Standard Slip", reference } = req.body;

    const cleanBvn = String(bvn || "").trim();
    if (!cleanBvn || cleanBvn.length !== 11) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "A valid 11-digit Bank Verification Number (BVN) is required.",
      });
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    let pricing = null;
    try {
      pricing = await prisma.servicePricing.findFirst({
        where: {
          category: "IDENTITY",
          enabled: true,
          tier: userTier,
          OR: [
            { serviceCode: "BVN_VERIFY" },
            { serviceCode: { contains: "BVN" } },
          ],
        },
      });
    } catch (_) {}

    const cost = Number(pricing?.sellingPrice || 70);
    chargedCost = cost;
    const txRef = reference || `AYAX_BVN_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction, userId } = await chargeWallet({
      user,
      cost,
      service: "BVN VERIFICATION",
      description: `BVN Verification for [${cleanBvn}] (${slipType})`,
      reference: txRef,
    });

    chargedTransaction = transaction;
    chargedUserId = userId;

    const result = await abjiktech.verifyBVN(cleanBvn, slipType);

    if (!result || !result.success) {
      const failureReason = result?.message || "BVN verification failed";
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: failureReason,
      });

      return res.status(502).json({
        status: "error",
        code: "GATEWAY_ERROR",
        message: failureReason,
      });
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCESSFUL" },
    });

    return res.status(200).json({
      status: "success",
      code: "VERIFICATION_SUCCESSFUL",
      message: "BVN verified successfully.",
      data: {
        reference: txRef,
        bvn: cleanBvn,
        slipType,
        details: result.data || result,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    if (chargedTransaction && chargedUserId) {
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: error.message,
      });
    }

    console.error("BVN Verification error:", error.message);
    return res.status(error.statusCode || 500).json({
      status: "error",
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "An error occurred during BVN verification.",
    });
  }
};

/* ======================================================
   4. NIN VALIDATION (SUBMIT & STATUS)
   POST /api/v1/identity/nin/validate
====================================================== */
exports.validateNinIssue = async (req, res) => {
  let chargedTransaction = null;
  let chargedUserId = null;
  let chargedCost = 0;

  try {
    const user = req.user || req.apiKeyUser;
    const { nin, issueType, errorType, reference } = req.body;

    const cleanNin = String(nin || "").trim();
    if (!cleanNin || cleanNin.length !== 11) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "An 11-digit NIN is required for issue resolution.",
      });
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const rawType = String(errorType || issueType || "no_record").toLowerCase();
    let mappedError = "no_record";

    if (rawType.includes("sim") || rawType.includes("bank")) mappedError = "simbank_validation";
    else if (rawType.includes("mod") || rawType.includes("dob") || rawType.includes("name")) mappedError = "modification";
    else if (rawType.includes("photo") || rawType.includes("bio")) mappedError = "photo_error";
    else if (rawType.includes("record")) mappedError = "no_record";

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    let pricing = null;
    try {
      pricing = await prisma.servicePricing.findFirst({
        where: {
          category: "IDENTITY",
          enabled: true,
          tier: userTier,
          OR: [
            { serviceCode: `NIN_VALIDATION_${mappedError.toUpperCase()}` },
            { serviceCode: "NIN_VALIDATION" },
          ],
        },
      });
    } catch (_) {}

    const cost = Number(pricing?.sellingPrice || 1500);
    chargedCost = cost;
    const txRef = reference || `AYAX_VAL_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction, userId } = await chargeWallet({
      user,
      cost,
      service: "NIN VALIDATION",
      description: `NIN Validation (${mappedError}) for [${cleanNin}]`,
      reference: txRef,
    });

    chargedTransaction = transaction;
    chargedUserId = userId;

    const result = await abjiktech.submitNinValidation({ nin: cleanNin, errorType: mappedError });

    if (!result || result.success === false) {
      const failureReason = result?.message || "Validation submission rejected";
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: failureReason,
      });

      return res.status(400).json({
        status: "error",
        code: "VALIDATION_FAILED",
        message: failureReason,
      });
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "PROCESSING" },
    });

    return res.status(200).json({
      status: "success",
      code: "VALIDATION_QUEUED",
      message: result.message || "NIN validation submitted and awaiting manual clearance.",
      data: {
        reference: txRef,
        nin: cleanNin,
        errorType: mappedError,
        ticketId: result?.data?.ticket_id,
        transactionId: result?.data?.transaction_id,
        status: result?.data?.status || "pending",
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    if (chargedTransaction && chargedUserId) {
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: error.message,
      });
    }

    console.error("NIN Validation error:", error.message);
    return res.status(error.statusCode || 500).json({
      status: "error",
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "An error occurred during validation submission.",
    });
  }
};

exports.checkNinValidationStatus = async (req, res) => {
  try {
    const { ticketId, transactionId } = req.body;
    if (!ticketId && !transactionId) {
      return res.status(400).json({
        status: "error",
        message: "Either ticketId or transactionId is required to check validation status.",
      });
    }

    const result = await abjiktech.checkNinValidationStatus({ ticketId, transactionId });
    return res.status(result?.success ? 200 : 404).json(result);
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/* ======================================================
   5. IPE CLEARANCE (SUBMIT & STATUS)
   POST /api/v1/identity/ipe/submit
====================================================== */
exports.submitIpeClearance = async (req, res) => {
  let chargedTransaction = null;
  let chargedUserId = null;
  let chargedCost = 0;

  try {
    const user = req.user || req.apiKeyUser;
    const { trackingID, reference } = req.body;

    const cleanTrackingID = String(trackingID || "").trim();
    if (!cleanTrackingID) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Tracking ID is required for IPE clearance.",
      });
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const userTier = String(user.tier || "REGULAR").toUpperCase();
    let pricing = null;
    try {
      pricing = await prisma.servicePricing.findFirst({
        where: { category: "IDENTITY", enabled: true, tier: userTier, serviceCode: "IPE_CLEARANCE" },
      });
    } catch (_) {}

    const cost = Number(pricing?.sellingPrice || 2000);
    chargedCost = cost;
    const txRef = reference || `AYAX_IPE_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction, userId } = await chargeWallet({
      user,
      cost,
      service: "IPE CLEARANCE",
      description: `IPE Clearance for Tracking ID [${cleanTrackingID}]`,
      reference: txRef,
    });

    chargedTransaction = transaction;
    chargedUserId = userId;

    const result = await abjiktech.submitIpeClearance(cleanTrackingID);

    if (!result || result.success === false) {
      const failureReason = result?.message || "IPE clearance submission failed";
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: failureReason,
      });

      return res.status(400).json({
        status: "error",
        code: "SUBMISSION_FAILED",
        message: failureReason,
      });
    }

    return res.status(200).json({
      status: "success",
      code: "IPE_SUBMITTED",
      message: "IPE clearance submitted for manual processing.",
      data: {
        reference: txRef,
        trackingID: cleanTrackingID,
        result: result?.data || result,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    if (chargedTransaction && chargedUserId) {
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: error.message,
      });
    }

    console.error("IPE Clearance error:", error.message);
    return res.status(error.statusCode || 500).json({
      status: "error",
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "An error occurred during IPE clearance submission.",
    });
  }
};

exports.checkIpeStatus = async (req, res) => {
  try {
    const { trackingID } = req.body;
    if (!trackingID) {
      return res.status(400).json({ status: "error", message: "trackingID is required." });
    }

    const result = await abjiktech.checkIpeStatus(trackingID);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/* ======================================================
   6. NIN PERSONALIZATION (SUBMIT & STATUS)
   POST /api/v1/identity/personalization/submit
====================================================== */
exports.submitPersonalization = async (req, res) => {
  let chargedTransaction = null;
  let chargedUserId = null;
  let chargedCost = 0;

  try {
    const user = req.user || req.apiKeyUser;
    const { trackingId, reference } = req.body;

    const cleanTID = String(trackingId || "").trim();
    if (!cleanTID) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "NIN Tracking ID is required for personalization.",
      });
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const userTier = String(user.tier || "REGULAR").toUpperCase();
    let pricing = null;
    try {
      pricing = await prisma.servicePricing.findFirst({
        where: { category: "IDENTITY", enabled: true, tier: userTier, serviceCode: "NIN_PERSONALIZATION" },
      });
    } catch (_) {}

    const cost = Number(pricing?.sellingPrice || 1200);
    chargedCost = cost;
    const txRef = reference || `AYAX_PERS_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction, userId } = await chargeWallet({
      user,
      cost,
      service: "NIN PERSONALIZATION",
      description: `NIN Personalization for [${cleanTID}]`,
      reference: txRef,
    });

    chargedTransaction = transaction;
    chargedUserId = userId;

    const result = await abjiktech.submitPersonalization(cleanTID);

    if (!result || result.success === false) {
      const failureReason = result?.message || "Personalization request failed";
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: failureReason,
      });

      return res.status(400).json({
        status: "error",
        code: "PERSONALIZATION_FAILED",
        message: failureReason,
      });
    }

    return res.status(200).json({
      status: "success",
      code: "PERSONALIZATION_QUEUED",
      message: "Personalization submitted successfully.",
      data: {
        reference: txRef,
        trackingId: cleanTID,
        result: result?.data || result,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    if (chargedTransaction && chargedUserId) {
      await refundTransaction({
        userId: chargedUserId,
        cost: chargedCost,
        transactionId: chargedTransaction.id,
        reason: error.message,
      });
    }

    console.error("Personalization error:", error.message);
    return res.status(error.statusCode || 500).json({
      status: "error",
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "An error occurred during personalization submission.",
    });
  }
};

exports.checkPersonalizationStatus = async (req, res) => {
  try {
    const { trackingId } = req.body;
    if (!trackingId) {
      return res.status(400).json({ status: "error", message: "trackingId is required." });
    }

    const result = await abjiktech.checkPersonalizationStatus(trackingId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};