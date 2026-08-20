const prisma = require("../config/prisma");
const axios = require("axios");

/* ======================================================
   HELPERS
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

    // Idan babu tsohon funding request (misali direct DVA transfer ce)
    if (!funding) {
      const wallet = await getOrCreateWallet(userId, tx);
      const balanceBefore = Number(wallet.balance || 0);
      const balanceAfter = Number((balanceBefore + Number(amount)).toFixed(2));
      const ledgerReference = `PAYSTACK-${paymentReference || fundingReference}`;

      const existingLedger = await tx.walletLedger.findUnique({
        where: { reference: ledgerReference },
      });

      if (existingLedger) {
        return { alreadyProcessed: true, wallet };
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          reference: ledgerReference,
          type: "CREDIT",
          amount: Number(amount),
          balanceBefore,
          balanceAfter,
          description: "Wallet funding through Paystack DVA",
          module: "PAYSTACK",
        },
      });

      return { alreadyProcessed: false, wallet: updatedWallet };
    }

    if (funding.userId !== userId) {
      throw new Error("Funding request does not belong to this user.");
    }

    if (funding.status === "APPROVED") {
      const existingWallet = await getOrCreateWallet(userId, tx);
      return { alreadyProcessed: true, wallet: existingWallet };
    }

    const wallet = await getOrCreateWallet(userId, tx);
    const balanceBefore = Number(wallet.balance || 0);
    const balanceAfter = Number((balanceBefore + Number(amount)).toFixed(2));
    const ledgerReference = `PAYSTACK-${fundingReference}`;

    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: { balance: balanceAfter },
    });

    await tx.walletFunding.update({
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

    return { alreadyProcessed: false, wallet: updatedWallet };
  });
};

/* ======================================================
   UPDATE DATA XPRESS WALLET
====================================================== */

async function updateDataXpressWallet(transactionData) {
  const { reference, amount, customer, metadata } = transactionData;
  const email = customer?.email?.toLowerCase().trim();
  const customerCode = customer?.customer_code;
  const paidAmount = Number(amount) / 100;

  console.log(`[Data Xpress Webhook] Forwarding funding for ${email}: NGN ${paidAmount}`);

  // TURA REQUEST ZUWA DATA XPRESS BACKEND SERVER (Don ya kara kudi a MongoDB User)
  const DATA_XPRESS_URL = process.env.DATA_XPRESS_API_URL || "https://ayax-data-xpress-server.onrender.com";
  
  try {
    await axios.post(
      `${DATA_XPRESS_URL}/api/v1/payment/webhook`,
      {
        event: "charge.success",
        data: transactionData,
      },
      {
        headers: {
          "x-paystack-signature": "internal_forwarded",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );
    console.log(`✅ Data Xpress webhook forwarded successfully for ref: ${reference}`);
  } catch (err) {
    console.error(`❌ Failed to forward to Data Xpress backend:`, err.response?.data || err.message);
  }
}

/* ======================================================
   UPDATE MARKETPLACE WALLET
====================================================== */

async function updateMarketplaceWallet(transactionData) {
  const { reference, amount, customer, metadata } = transactionData;
  const fundingReference = metadata?.fundingReference || reference;
  const email = customer?.email?.toLowerCase().trim();
  let userId = metadata?.userId;
  const paidAmount = Number(amount) / 100;

  // Idan babu userId a metadata (DVA Transfer), nemo shi a Prisma ta email
  if (!userId && email) {
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (dbUser) userId = dbUser.id;
  }

  if (!userId) {
    console.error(`User not found in Marketplace for ref: ${reference}`);
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
   PAYSTACK WEBHOOK CONTROLLER
====================================================== */

exports.handlePaystackWebhook = async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "charge.success") {
      const transactionData = event.data;
      const metadata = transactionData.metadata;
      const platform = metadata?.platform;

      if (platform === "ayax_marketplace") {
        await updateMarketplaceWallet(transactionData);
      } else if (platform === "ayax_data_xpress") {
        await updateDataXpressWallet(transactionData);
      } else {
        // IDAN BABU PLATFORM METADATA (DVA Virtual Account Transfer ce):
        // Duba ko na Data Xpress ne ko Marketplace ta hanyar tura shi zuwa Data Xpress ko sabunta Marketplace
        console.log(`DVA Bank Transfer detected without platform flag. Processing auto-forwarding...`);
        await updateDataXpressWallet(transactionData);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.sendStatus(200);
  }
};