const prisma = require("../config/prisma");
const abjiktech = require("../services/abjiktech.service");

/* ======================================================
   HELPER FUNCTIONS (WALLET CHARGE & REFUND)
====================================================== */

// Cire kudi a wallet da ajiye pending/processing transaction
async function chargeWallet({ userId, cost, service, description, reference }) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet || Number(wallet.balance) < cost) {
    const err = new Error(`Insufficient wallet balance. NGN ${cost} is required for this service.`);
    err.statusCode = 402;
    err.code = "INSUFFICIENT_BALANCE";
    throw err;
  }

  const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: cost } },
    });

    const t = await tx.transaction.create({
      data: {
        userId,
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

  return { updatedWallet, transaction };
}

// Mayar da kudi ga wallet nan take idan upstream ya bada kuskure
async function refundTransaction({ userId, cost, transactionId, reason }) {
  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: cost } },
    }),
    prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "FAILED", description: `FAILED & REFUNDED: ${reason}` },
    }),
  ]).catch((err) => console.error("Refund processing failed:", err.message));
}

/* ======================================================
   1. NIN VERIFICATION (BY 11-DIGIT NIN)
   POST /api/v1/identity/nin/verify
====================================================== */
exports.verifyNin = async (req, res) => {
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

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    const pricing = await prisma.servicePricing.findFirst({
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

    const cost = Number(pricing?.sellingPrice || 100);
    const txRef = reference || `AYAX_NIN_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction } = await chargeWallet({
      userId: user.id,
      cost,
      service: "NIN VERIFICATION",
      description: `NIN Verification for [${cleanNin}] (${slipType})`,
      reference: txRef,
    });

    const result = await abjiktech.verifyNIN(cleanNin, slipType);

    if (!result.success) {
      await refundTransaction({
        userId: user.id,
        cost,
        transactionId: transaction.id,
        reason: result.message || "Gateway response failed",
      });

      return res.status(502).json({
        status: "error",
        code: "GATEWAY_ERROR",
        message: result.message || "NIN record not found or gateway unavailable. Wallet refunded.",
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
        details: result,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    console.error("NIN Verification error:", error);
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "An error occurred during NIN verification.",
    });
  }
};

/* ======================================================
   2. NIN VERIFICATION (BY PHONE NUMBER)
   POST /api/v1/identity/nin/verify-phone
====================================================== */
exports.verifyNinByPhone = async (req, res) => {
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

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    const pricing = await prisma.servicePricing.findFirst({
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

    const cost = Number(pricing?.sellingPrice || 100);
    const txRef = reference || `AYAX_PHN_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction } = await chargeWallet({
      userId: user.id,
      cost,
      service: "NIN PHONE VERIFICATION",
      description: `NIN Phone Verification for [${cleanPhone}] (${slipType})`,
      reference: txRef,
    });

    const result = await abjiktech.verifyNINByPhone(cleanPhone, slipType);

    if (!result.success) {
      await refundTransaction({
        userId: user.id,
        cost,
        transactionId: transaction.id,
        reason: result.message || "Phone lookup failed",
      });

      return res.status(502).json({
        status: "error",
        code: "GATEWAY_ERROR",
        message: result.message || "No NIN linked to this phone number or gateway error. Wallet refunded.",
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
        details: result,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    console.error("NIN Phone Verification error:", error);
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "An error occurred during phone verification.",
    });
  }
};

/* ======================================================
   3. BVN VERIFICATION
   POST /api/v1/identity/bvn/verify
====================================================== */
exports.verifyBvn = async (req, res) => {
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

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    const pricing = await prisma.servicePricing.findFirst({
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

    const cost = Number(pricing?.sellingPrice || 70);
    const txRef = reference || `AYAX_BVN_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction } = await chargeWallet({
      userId: user.id,
      cost,
      service: "BVN VERIFICATION",
      description: `BVN Verification for [${cleanBvn}] (${slipType})`,
      reference: txRef,
    });

    const result = await abjiktech.verifyBVN(cleanBvn, slipType);

    if (!result.success) {
      await refundTransaction({
        userId: user.id,
        cost,
        transactionId: transaction.id,
        reason: result.message || "BVN verification failed",
      });

      return res.status(502).json({
        status: "error",
        code: "GATEWAY_ERROR",
        message: result.message || "BVN record not found or gateway unavailable. Wallet refunded.",
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
        details: result,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    console.error("BVN Verification error:", error);
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "An error occurred during BVN verification.",
    });
  }
};

/* ======================================================
   4. NIN VALIDATION (SUBMIT & STATUS)
   POST /api/v1/identity/nin/validate
====================================================== */
exports.validateNinIssue = async (req, res) => {
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

    // Daidaita sunayen kurakurai zuwa na Abjiktech (no_record, simbank_validation, modification, photo_error)
    const rawType = String(errorType || issueType || "no_record").toLowerCase();
    let mappedError = "no_record";

    if (rawType.includes("sim") || rawType.includes("bank")) mappedError = "simbank_validation";
    else if (rawType.includes("mod") || rawType.includes("dob") || rawType.includes("name")) mappedError = "modification";
    else if (rawType.includes("photo") || rawType.includes("bio")) mappedError = "photo_error";
    else if (rawType.includes("record")) mappedError = "no_record";

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    const pricing = await prisma.servicePricing.findFirst({
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

    const cost = Number(pricing?.sellingPrice || 1500);
    const txRef = reference || `AYAX_VAL_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction } = await chargeWallet({
      userId: user.id,
      cost,
      service: "NIN VALIDATION",
      description: `NIN Validation (${mappedError}) for [${cleanNin}]`,
      reference: txRef,
    });

    const result = await abjiktech.submitNinValidation({ nin: cleanNin, errorType: mappedError });

    if (!result || result.success === false) {
      await refundTransaction({
        userId: user.id,
        cost,
        transactionId: transaction.id,
        reason: result?.message || "Validation submission rejected",
      });

      return res.status(400).json({
        status: "error",
        code: "VALIDATION_FAILED",
        message: result?.message || "Validation submission failed. Wallet refunded.",
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
    console.error("NIN Validation error:", error);
    return res.status(error.statusCode || 500).json({
      status: "error",
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

    const userTier = String(user.tier || "REGULAR").toUpperCase();
    const pricing = await prisma.servicePricing.findFirst({
      where: { category: "IDENTITY", enabled: true, tier: userTier, serviceCode: "IPE_CLEARANCE" },
    });

    const cost = Number(pricing?.sellingPrice || 2000);
    const txRef = reference || `AYAX_IPE_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction } = await chargeWallet({
      userId: user.id,
      cost,
      service: "IPE CLEARANCE",
      description: `IPE Clearance for Tracking ID [${cleanTrackingID}]`,
      reference: txRef,
    });

    const result = await abjiktech.submitIpeClearance(cleanTrackingID);

    if (!result || result.success === false) {
      await refundTransaction({
        userId: user.id,
        cost,
        transactionId: transaction.id,
        reason: result?.message || "IPE clearance submission failed",
      });

      return res.status(400).json({
        status: "error",
        code: "SUBMISSION_FAILED",
        message: result?.message || "IPE clearance submission failed. Wallet refunded.",
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
    console.error("IPE Clearance error:", error);
    return res.status(error.statusCode || 500).json({
      status: "error",
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

    const userTier = String(user.tier || "REGULAR").toUpperCase();
    const pricing = await prisma.servicePricing.findFirst({
      where: { category: "IDENTITY", enabled: true, tier: userTier, serviceCode: "NIN_PERSONALIZATION" },
    });

    const cost = Number(pricing?.sellingPrice || 1200);
    const txRef = reference || `AYAX_PERS_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction } = await chargeWallet({
      userId: user.id,
      cost,
      service: "NIN PERSONALIZATION",
      description: `NIN Personalization for [${cleanTID}]`,
      reference: txRef,
    });

    const result = await abjiktech.submitPersonalization(cleanTID);

    if (!result || result.success === false) {
      await refundTransaction({
        userId: user.id,
        cost,
        transactionId: transaction.id,
        reason: result?.message || "Personalization request failed",
      });

      return res.status(400).json({
        status: "error",
        code: "PERSONALIZATION_FAILED",
        message: result?.message || "Personalization submission failed. Wallet refunded.",
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
    console.error("Personalization error:", error);
    return res.status(error.statusCode || 500).json({
      status: "error",
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