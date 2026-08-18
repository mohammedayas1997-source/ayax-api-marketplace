const prisma = require("../config/prisma");
const clubkonnect = require("./providers/clubkonnect.service");
const walletService = require("./wallet.service");
const transactionService = require("./transaction.service");
const apiUsageService = require("./apiUsage.service");

/* ======================================================
   CABLE TV SERVICES
====================================================== */

exports.validateCableIUC = async ({ cableTv, smartCardNo }) => {
  return clubkonnect.verifyCable({ cableTv, smartCardNo });
};

exports.purchaseCable = async ({ user, apiKey, cableTv, packageCode, smartCardNo, phone, amount, reference }) => {
  const finalAmount = Number(amount);
  const txReference = reference || `AYAX_CABLE_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < finalAmount) {
    const err = new Error("Insufficient wallet balance.");
    err.statusCode = 402;
    throw err;
  }

  const transaction = await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "CABLE_TV",
    amount: finalAmount,
    reference: txReference,
    status: "PROCESSING",
    description: `${cableTv.toUpperCase()} Subscription (${packageCode}) for ${smartCardNo}`,
    metadata: { cableTv, packageCode, smartCardNo, phone, apiKeyId: apiKey?.id },
  });

  await walletService.debitWallet({
    userId: user.id,
    amount: finalAmount,
    reference: txReference,
    description: `${cableTv.toUpperCase()} Subscription`,
    module: "CABLE_TV",
  });

  try {
    const result = await clubkonnect.buyCable({
      cableTv,
      packageCode,
      smartCardNo,
      phone,
      reference: txReference,
    });

    await transactionService.updateTransactionStatus({
      reference: txReference,
      status: "SUCCESSFUL",
      description: "Cable subscription activated",
    });

    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/v1/bills/cable/buy",
      method: "POST",
      amount: finalAmount,
      status: "SUCCESSFUL",
    });

    return {
      success: true,
      reference: txReference,
      cableTv,
      packageCode,
      smartCardNo,
      amount: finalAmount,
      status: "SUCCESSFUL",
    };
  } catch (error) {
    // Auto Refund
    await walletService.creditWallet({
      userId: user.id,
      amount: finalAmount,
      reference: `REFUND_${txReference}`,
      description: `Refund for failed cable subscription: ${txReference}`,
      module: "REFUND",
    }).catch(console.error);

    await transactionService.updateTransactionStatus({
      reference: txReference,
      status: "FAILED",
      description: error.message,
    });

    const err = new Error(error.message || "Failed to process cable subscription.");
    err.statusCode = 502;
    throw err;
  }
};

/* ======================================================
   ELECTRICITY SERVICES
====================================================== */

exports.validateMeterNumber = async ({ disco, meterNo, meterType }) => {
  return clubkonnect.verifyMeter({ disco, meterNo, meterType });
};

exports.purchaseElectricity = async ({ user, apiKey, disco, meterNo, meterType, amount, phone, reference }) => {
  const finalAmount = Number(amount);
  const txReference = reference || `AYAX_POWER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < finalAmount) {
    const err = new Error("Insufficient wallet balance.");
    err.statusCode = 402;
    throw err;
  }

  const transaction = await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "ELECTRICITY",
    amount: finalAmount,
    reference: txReference,
    status: "PROCESSING",
    description: `${disco.toUpperCase()} Power Recharge for Meter: ${meterNo}`,
    metadata: { disco, meterNo, meterType, phone, apiKeyId: apiKey?.id },
  });

  await walletService.debitWallet({
    userId: user.id,
    amount: finalAmount,
    reference: txReference,
    description: `${disco.toUpperCase()} Power Recharge`,
    module: "ELECTRICITY",
  });

  try {
    const result = await clubkonnect.buyElectricity({
      disco,
      meterNo,
      meterType,
      amount: finalAmount,
      phone,
      reference: txReference,
    });

    await transactionService.updateTransactionStatus({
      reference: txReference,
      status: "SUCCESSFUL",
      description: "Electricity recharge successful",
    });

    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/v1/bills/electricity/buy",
      method: "POST",
      amount: finalAmount,
      status: "SUCCESSFUL",
    });

    return {
      success: true,
      reference: txReference,
      disco,
      meterNo,
      token: result.token,
      units: result.units,
      amount: finalAmount,
      status: "SUCCESSFUL",
    };
  } catch (error) {
    // Auto Refund
    await walletService.creditWallet({
      userId: user.id,
      amount: finalAmount,
      reference: `REFUND_${txReference}`,
      description: `Refund for failed power recharge: ${txReference}`,
      module: "REFUND",
    }).catch(console.error);

    await transactionService.updateTransactionStatus({
      reference: txReference,
      status: "FAILED",
      description: error.message,
    });

    const err = new Error(error.message || "Failed to recharge electricity.");
    err.statusCode = 502;
    throw err;
  }
};