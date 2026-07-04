const axios = require("axios");
const prisma = require("../config/prisma");
const generateReference = require("../helpers/generateReference");


exports.getOrCreateWallet = async (userId) => {
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
      },
    });
  }

  return wallet;
};

exports.debitWallet = async ({
  userId,
  amount,
  reference,
  description = "API wallet debit",
  module = "API_USAGE",
}) => {
  const wallet = await exports.getOrCreateWallet(userId);

  if (wallet.balance < Number(amount)) {
    throw new Error("Insufficient wallet balance");
  }

  const balanceBefore = wallet.balance;
  const balanceAfter = balanceBefore - Number(amount);

  return prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: {
        balance: balanceAfter,
      },
    });

    const ledger = await tx.walletLedger.create({
      data: {
        userId,
        reference: reference || generateReference("DEBIT"),
        type: "DEBIT",
        amount: Number(amount),
        balanceBefore,
        balanceAfter,
        description,
        module,
      },
    });

    return {
      wallet: updatedWallet,
      ledger,
    };
  });
};

exports.creditWallet = async ({
  userId,
  amount,
  reference,
  description = "Wallet credit",
  module = "WALLET",
}) => {
  const wallet = await exports.getOrCreateWallet(userId);

  const balanceBefore = wallet.balance;
  const balanceAfter = balanceBefore + Number(amount);

  return prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: {
        balance: balanceAfter,
      },
    });

    const ledger = await tx.walletLedger.create({
      data: {
        userId,
        reference: reference || generateReference("CREDIT"),
        type: "CREDIT",
        amount: Number(amount),
        balanceBefore,
        balanceAfter,
        description,
        module,
      },
    });

    return {
      wallet: updatedWallet,
      ledger,
    };
  });
};
exports.initializePaystackFunding = async ({ userId, email, amount }) => {
  const nairaAmount = Number(amount);

  if (!nairaAmount || nairaAmount < 100) {
    throw new Error("Minimum funding amount is ₦100");
  }

  const reference = `AYAX-FUND-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

  const funding = await prisma.walletFunding.create({
    data: {
      userId,
      amount: nairaAmount,
      reference,
      channel: "PAYSTACK",
      status: "PENDING",
    },
  });

  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email,
      amount: nairaAmount * 100,
      reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return {
    funding,
    authorizationUrl: response.data.data.authorization_url,
    accessCode: response.data.data.access_code,
    reference,
  };
};

exports.verifyPaystackFunding = async ({ reference, userId }) => {
  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const payment = response.data.data;

  if (payment.status !== "success") {
    throw new Error("Payment not successful");
  }

  const funding = await prisma.walletFunding.findFirst({
    where: { reference, userId },
  });

  if (!funding) throw new Error("Funding request not found");

  if (funding.status === "APPROVED") {
    return { funding, alreadyVerified: true };
  }

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: {
        balance: {
          increment: funding.amount,
        },
      },
      create: {
        userId,
        balance: funding.amount,
      },
    });

    const updatedFunding = await tx.walletFunding.update({
      where: { id: funding.id },
      data: {
        status: "APPROVED",
        paymentReference: payment.reference,
        note: "Paystack payment verified",
      },
    });

   const balanceBefore = wallet.balance - funding.amount;

  await tx.walletLedger.create({
    data: {
      userId,
      reference,
      type: "CREDIT",
      amount: funding.amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      module: "PAYSTACK",
      description: "Wallet funded via Paystack",
    },
  });

    return { wallet, funding: updatedFunding };
  });

  return result;
};
exports.creditWalletFromPaystack = async ({ reference, amount, paymentReference }) => {
  const funding = await prisma.walletFunding.findUnique({
    where: { reference },
  });

  if (!funding) {
    throw new Error("Funding request not found");
  }

  if (funding.status === "APPROVED") {
    return { alreadyCredited: true, funding };
  }

  const amountInNaira = Number(amount) / 100;

  if (Number(funding.amount) !== Number(amountInNaira)) {
    throw new Error("Payment amount mismatch");
  }

  return prisma.$transaction(async (tx) => {
    const currentWallet = await tx.wallet.upsert({
      where: { userId: funding.userId },
      update: {},
      create: {
        userId: funding.userId,
        balance: 0,
      },
    });

    const balanceBefore = currentWallet.balance;
    const balanceAfter = balanceBefore + funding.amount;

    const wallet = await tx.wallet.update({
      where: { userId: funding.userId },
      data: {
        balance: balanceAfter,
      },
    });

    const updatedFunding = await tx.walletFunding.update({
      where: { id: funding.id },
      data: {
        status: "APPROVED",
        paymentReference,
        note: "Paystack webhook verified",
        approvedAt: new Date(),
      },
    });

    await tx.walletLedger.create({
      data: {
        userId: funding.userId,
        reference,
        type: "CREDIT",
        amount: funding.amount,
        balanceBefore,
        balanceAfter,
        module: "PAYSTACK",
        description: "Wallet funded via Paystack",
      },
    });

    await tx.transaction.create({
      data: {
        userId: funding.userId,
        reference,
        type: "CREDIT",
        amount: funding.amount,
        status: "SUCCESSFUL",
        service: "WALLET_FUNDING",
        description: "Wallet funding via Paystack",
      },
    });

    return {
      wallet,
      funding: updatedFunding,
    };
  });
};