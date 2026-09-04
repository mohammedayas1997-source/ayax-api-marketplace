const prisma = require("../config/prisma");
const abjiktech = require("./abjiktech.service");
const walletService = require("./wallet.service");
const transactionService = require("./transaction.service");

/* ======================================================
   1. NIN VERIFICATION (ABJIKTECH)
====================================================== */
exports.verifyNIN = async ({ user, nin, slipType = "Standard Slip", reference }) => {
  const cleanNIN = String(nin || "").trim();
  if (!cleanNIN || cleanNIN.length !== 11) {
    const err = new Error("A valid 11-digit National Identity Number (NIN) is required.");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (!user || !user.id) {
    const err = new Error("Authentication is required.");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

  const pricing = await prisma.servicePricing.findFirst({
    where: {
      category: "IDENTITY",
      tier: userTier,
      enabled: true,
      OR: [
        { serviceCode: "NIN_VERIFY" },
        { serviceCode: "NIN" },
        { serviceName: { contains: "NIN", mode: "insensitive" } },
      ],
    },
  });

  const cost = Number(pricing?.sellingPrice || 100);

  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < cost) {
    const err = new Error(`Insufficient wallet balance. NGN ${cost} is required for NIN verification.`);
    err.statusCode = 402;
    err.code = "INSUFFICIENT_BALANCE";
    throw err;
  }

  const txReference = reference || `AYAX_NIN_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "NIN VERIFICATION",
    amount: cost,
    reference: txReference,
    status: "PROCESSING",
    description: `NIN Verification for [${cleanNIN}] (${slipType})`,
  });

  await walletService.debitWallet({
    userId: user.id,
    amount: cost,
    reference: txReference,
    description: `NIN Verification Fee: ${cleanNIN}`,
    module: "IDENTITY",
  });

  // Kira Abjiktech API
  const result = await abjiktech.verifyNIN(cleanNIN);

  if (result.success) {
    await transactionService.updateTransactionStatus({
      reference: txReference,
      status: "SUCCESSFUL",
      description: `Verified NIN: ${cleanNIN} (${result.firstName} ${result.surname})`,
    });

    return {
      reference: txReference,
      status: "SUCCESSFUL",
      amountCharged: cost,
      ninDetails: {
        nin: result.nin,
        firstName: result.firstName,
        surname: result.surname,
        middleName: result.middleName,
        phone: result.phone,
        gender: result.gender,
        dob: result.dob,
        photo: result.photo,
        address: result.address,
        raw: result.raw,
      },
    };
  }

  // Auto-Refund nan take
  await walletService.creditWallet({
    userId: user.id,
    amount: cost,
    reference: `REFUND_${txReference}`,
    description: `Refund: NIN verification failed for ${cleanNIN}`,
    module: "REFUND",
  }).catch((e) => console.error("Wallet refund error:", e));

  await transactionService.updateTransactionStatus({
    reference: txReference,
    status: "FAILED",
    description: result.message || "Verification failed",
  });

  const error = new Error(result.message || "Unable to verify NIN via Abjiktech. Wallet refunded.");
  error.statusCode = 404;
  error.code = "VERIFICATION_FAILED";
  throw error;
};

/* ======================================================
   2. BVN VERIFICATION (ABJIKTECH)
====================================================== */
exports.verifyBVN = async ({ user, bvn, reference }) => {
  const cleanBVN = String(bvn || "").trim();
  if (!cleanBVN || cleanBVN.length !== 11) {
    const err = new Error("A valid 11-digit Bank Verification Number (BVN) is required.");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (!user || !user.id) {
    const err = new Error("Authentication is required.");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

  const pricing = await prisma.servicePricing.findFirst({
    where: {
      category: "IDENTITY",
      tier: userTier,
      enabled: true,
      OR: [
        { serviceCode: "BVN_VERIFY" },
        { serviceCode: "BVN" },
        { serviceName: { contains: "BVN", mode: "insensitive" } },
      ],
    },
  });

  const cost = Number(pricing?.sellingPrice || 70);

  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < cost) {
    const err = new Error(`Insufficient wallet balance. NGN ${cost} is required for BVN verification.`);
    err.statusCode = 402;
    err.code = "INSUFFICIENT_BALANCE";
    throw err;
  }

  const txReference = reference || `AYAX_BVN_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "BVN VERIFICATION",
    amount: cost,
    reference: txReference,
    status: "PROCESSING",
    description: `BVN Lookup for [${cleanBVN}]`,
  });

  await walletService.debitWallet({
    userId: user.id,
    amount: cost,
    reference: txReference,
    description: `BVN Verification Fee: ${cleanBVN}`,
    module: "IDENTITY",
  });

  // Kira Abjiktech API
  const result = await abjiktech.verifyBVN(cleanBVN);

  if (result.success) {
    await transactionService.updateTransactionStatus({
      reference: txReference,
      status: "SUCCESSFUL",
      description: `Verified BVN: ${cleanBVN} (${result.firstName} ${result.surname})`,
    });

    return {
      reference: txReference,
      status: "SUCCESSFUL",
      amountCharged: cost,
      bvnDetails: {
        bvn: result.bvn,
        firstName: result.firstName,
        surname: result.surname,
        middleName: result.middleName,
        phone: result.phone,
        gender: result.gender,
        dob: result.dob,
        photo: result.photo,
        raw: result.raw,
      },
    };
  }

  // Auto-Refund nan take
  await walletService.creditWallet({
    userId: user.id,
    amount: cost,
    reference: `REFUND_${txReference}`,
    description: `Refund: BVN verification failed for ${cleanBVN}`,
    module: "REFUND",
  }).catch((e) => console.error("Wallet refund error:", e));

  await transactionService.updateTransactionStatus({
    reference: txReference,
    status: "FAILED",
    description: result.message || "Verification failed",
  });

  const error = new Error(result.message || "Unable to verify BVN via Abjiktech. Wallet refunded.");
  error.statusCode = 404;
  error.code = "VERIFICATION_FAILED";
  throw error;
};

/* ======================================================
   3. NIN VALIDATION / RESOLUTION (ABJIKTECH)
====================================================== */
exports.validateNinIssue = async ({ user, nin, issueType = "BANK_MISMATCH", reference }) => {
  const cleanNIN = String(nin || "").trim();
  if (!cleanNIN || cleanNIN.length !== 11) {
    const err = new Error("A valid 11-digit NIN is required for validation issue resolution.");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (!user || !user.id) {
    const err = new Error("Authentication is required.");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

  const pricing = await prisma.servicePricing.findFirst({
    where: {
      category: "IDENTITY",
      tier: userTier,
      enabled: true,
      OR: [
        { serviceCode: `NIN_VALIDATION_${issueType}` },
        { serviceCode: "NIN_VALIDATION" },
        { serviceName: { contains: "NIN Validation", mode: "insensitive" } },
      ],
    },
  });

  const cost = Number(pricing?.sellingPrice || 1500);

  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < cost) {
    const err = new Error(`Insufficient wallet balance. NGN ${cost} is required for NIN issue validation.`);
    err.statusCode = 402;
    err.code = "INSUFFICIENT_BALANCE";
    throw err;
  }

  const txReference = reference || `AYAX_VAL_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "NIN VALIDATION",
    amount: cost,
    reference: txReference,
    status: "PROCESSING",
    description: `NIN Validation Issue: ${issueType} for [${cleanNIN}]`,
  });

  await walletService.debitWallet({
    userId: user.id,
    amount: cost,
    reference: txReference,
    description: `NIN Issue Resolution: ${issueType}`,
    module: "IDENTITY",
  });

  // Kira Abjiktech API
  const result = await abjiktech.validateNINIssue({
    nin: cleanNIN,
    issueType,
    reference: txReference,
  });

  if (result.success) {
    await transactionService.updateTransactionStatus({
      reference: txReference,
      status: "SUCCESSFUL",
      description: `NIN Validation Submitted: ${cleanNIN} (${issueType})`,
    });

    return {
      reference: txReference,
      status: "SUCCESSFUL",
      nin: cleanNIN,
      issueType,
      amountCharged: cost,
      trackingId: result.trackingId,
      message: result.message,
    };
  }

  // Auto-Refund nan take
  await walletService.creditWallet({
    userId: user.id,
    amount: cost,
    reference: `REFUND_${txReference}`,
    description: `Refund: NIN Validation failed for ${cleanNIN}`,
    module: "REFUND",
  }).catch((e) => console.error("Wallet refund error:", e));

  await transactionService.updateTransactionStatus({
    reference: txReference,
    status: "FAILED",
    description: result.message || "NIN validation submission failed",
  });

  const error = new Error(result.message || "NIN validation request failed. Funds refunded.");
  error.statusCode = 400;
  error.code = "VALIDATION_SUBMISSION_FAILED";
  throw error;
};