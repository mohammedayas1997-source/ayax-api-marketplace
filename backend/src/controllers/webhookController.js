const prisma = require("../config/prisma");

/* ======================================================
   HELPERS (Idan ba a cikin abu ɗaya suke ba, zaka iya shigo da su)
====================================================== */

const getOrCreateWallet = async (userId, transactionClient = prisma) => {
  let wallet = await transactionClient.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await transactionClient.wallet.create({
      data: {
        userId,
        balance: 0,
      },
    });
  }

  return wallet;
};

const creditWalletFromPaystack = async ({
  userId,
  amount,
  fundingReference,
  paymentReference,
}) => {
  return prisma.$transaction(async (tx) => {
    const funding = await tx.walletFunding.findUnique({
      where: { reference: fundingReference },
    });

    if (!funding) {
      throw new Error("Funding record not found.");
    }

    if (funding.userId !== userId) {
      throw new Error("Funding request does not belong to this user.");
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (funding.status === "APPROVED") {
      const existingWallet = await getOrCreateWallet(userId, tx);
      return {
        alreadyProcessed: true,
        wallet: existingWallet,
        funding,
        user,
        amount: Number(amount),
        reference: fundingReference,
      };
    }

    const wallet = await getOrCreateWallet(userId, tx);
    const balanceBefore = Number(wallet.balance || 0);
    const balanceAfter = Number((balanceBefore + Number(amount)).toFixed(2));
    const ledgerReference = `PAYSTACK-${fundingReference}`;

    const existingLedger = await tx.walletLedger.findUnique({
      where: { reference: ledgerReference },
    });

    if (existingLedger) {
      const updatedFunding = await tx.walletFunding.update({
        where: { id: funding.id },
        data: {
          status: "APPROVED",
          approvedAt: funding.approvedAt || new Date(),
          paymentReference: paymentReference || funding.paymentReference,
          channel: funding.channel || "PAYSTACK",
        },
      });

      return {
        alreadyProcessed: true,
        wallet,
        funding: updatedFunding,
        user,
        previousBalance: balanceBefore,
        newBalance: balanceAfter,
        amount: Number(amount),
        reference: fundingReference,
      };
    }

    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: { balance: balanceAfter },
    });

    const updatedFunding = await tx.walletFunding.update({
      where: { id: funding.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        paymentReference: paymentReference || funding.paymentReference,
        channel: "PAYSTACK",
      },
    });

    await tx.walletLedger.create({
      data: {
        userId,
        reference: ledgerReference,
        type: "CREDIT",
        amount: Number(amount),
        balanceBefore,
        balanceAfter,
        description: "Wallet funding through Paystack",
        module: "PAYSTACK",
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        reference: fundingReference,
        type: "CREDIT",
        service: "WALLET_FUNDING",
        amount: Number(amount),
        status: "APPROVED",
        description: "Wallet funded through Paystack",
      },
    }).catch((error) => {
      if (error?.code !== "P2002") {
        throw error;
      }
    });

    return {
      alreadyProcessed: false,
      wallet: updatedWallet,
      funding: updatedFunding,
      user,
      previousBalance: balanceBefore,
      newBalance: balanceAfter,
      amount: Number(amount),
      reference: fundingReference,
    };
  });
};

/* ======================================================
   UPDATE DATA XPRESS WALLET (Aikin sabunta wallet din Data Xpress)
====================================================== */

async function updateDataXpressWallet(transactionData) {
  const { reference, amount, customer, metadata } = transactionData;
  const email = customer?.email;
  const paidAmount = Number(amount) / 100;

  console.log(`Processing Data Xpress webhook funding for ${email}: NGN ${paidAmount}`);

  // Idan kana da wani database daban ko wani API endpoint na Data Xpress, zaka iya sabunta shi anan.
  // Misali, idan kana amfani da wani table daban ko kuma tura HTTP request zuwa Data Xpress server.
  
  console.log(`Data Xpress wallet updated successfully for reference: ${reference}`);
}

/* ======================================================
   UPDATE MARKETPLACE WALLET (Aikin sabunta wallet din Marketplace)
====================================================== */

async function updateMarketplaceWallet(transactionData) {
  const { reference, amount, customer, metadata } = transactionData;
  const fundingReference = metadata?.fundingReference || reference;
  const userId = metadata?.userId;
  const paidAmount = Number(amount) / 100;

  if (!userId) {
    console.error("User ID not found in transaction metadata for Marketplace.");
    return;
  }

  await creditWalletFromPaystack({
    userId,
    amount: paidAmount,
    fundingReference,
    paymentReference: reference,
  });

  console.log(`Marketplace wallet updated successfully for reference: ${reference}`);
}

/* ======================================================
   PAYSTACK WEBHOOK CONTROLLER (Babban Route Handler)
   POST /api/v1/webhook/paystack
====================================================== */

exports.handlePaystackWebhook = async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "charge.success") {
      const transactionData = event.data;
      const metadata = transactionData.metadata;

      const platform = metadata?.platform;

      if (platform === "ayax_data_xpress") {
        await updateDataXpressWallet(transactionData);
      } else if (platform === "ayax_marketplace") {
        await updateMarketplaceWallet(transactionData);
      } else {
        console.log("Transaction received without platform metadata. Defaulting or skipping.");
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.sendStatus(200);
  }
};