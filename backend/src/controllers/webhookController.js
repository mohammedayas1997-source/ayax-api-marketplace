const prisma = require("../config/prisma");
const axios = require("axios");
const crypto = require("crypto");

/* ======================================================
   1. TURA KUDI ZUWA AYAX DATA XPRESS (PRIMARY DISPATCH)
====================================================== */
async function forwardToDataXpress(transactionData) {
  const { reference, amount, customer } = transactionData;
  const email = customer?.email?.toLowerCase().trim();
  const paidAmount = Number(amount) / 100;

  console.log(`[Forwarding -> Ayax Data Xpress] Processing Ref: ${reference} for ${email} (₦${paidAmount})`);

  const rawUrl = process.env.DATA_XPRESS_API_URL || "https://ayax-data-xpress-server.onrender.com";
  const baseUrl = rawUrl.replace(/\/+$/, "");

  try {
    // Muna tura webhook din kai tsaye zuwa Ayax Data Xpress
    const response = await axios.post(
      `${baseUrl}/api/v1/payment/webhook`,
      {
        event: "charge.success",
        data: transactionData,
      },
      {
        headers: {
          "x-paystack-signature": "internal_forwarded",
          "Content-Type": "application/json",
        },
        timeout: 45000,
      }
    );
    console.log(`✅ [Ayax Data Xpress Response] Status: ${response.status} for Ref: ${reference}`);
  } catch (err) {
    console.error(
      `❌ [Ayax Data Xpress Forward Failed]:`,
      err.response?.status,
      err.response?.data || err.message
    );
  }
}

/* ======================================================
   2. HELPERS NA MARKETPLACE WALLET
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

const creditMarketplaceWallet = async (transactionData) => {
  const { reference, amount, customer, metadata } = transactionData;
  const fundingReference = metadata?.fundingReference || reference;
  const email = customer?.email?.toLowerCase().trim();
  let userId = metadata?.userId;
  const paidAmount = Number(amount) / 100;

  if (!userId && email) {
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (dbUser) userId = dbUser.id;
  }

  if (!userId) {
    console.warn(`User not found in Marketplace DB for ref: ${reference}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const ledgerReference = `PAYSTACK-${reference}`;

    const existingLedger = await tx.walletLedger.findUnique({
      where: { reference: ledgerReference },
    });

    if (existingLedger) {
      console.log(`Ref: ${reference} already processed in Marketplace.`);
      return;
    }

    const wallet = await getOrCreateWallet(userId, tx);
    const balanceBefore = Number(wallet.balance || 0);
    const balanceAfter = Number((balanceBefore + paidAmount).toFixed(2));

    await tx.wallet.update({
      where: { userId },
      data: { balance: balanceAfter },
    });

    await tx.walletLedger.create({
      data: {
        userId,
        reference: ledgerReference,
        type: "CREDIT",
        amount: paidAmount,
        balanceBefore,
        balanceAfter,
        description: "Wallet funding through Paystack DVA",
        module: "PAYSTACK",
      },
    });

    console.log(`✅ [Marketplace Wallet Updated] User ${userId} received +₦${paidAmount}`);
  });
};

/* ======================================================
   3. MAIN WEBHOOK CONTROLLER
====================================================== */
exports.handlePaystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers["x-paystack-signature"];

    // 1. Tabbatar da ingancin sa hannun Paystack
    if (signature && signature !== "internal_forwarded" && secret) {
      const payload = req.rawBody ? req.rawBody : JSON.stringify(req.body);
      const hash = crypto
        .createHmac("sha512", secret)
        .update(payload)
        .digest("hex");

      if (hash !== signature) {
        console.warn("[Webhook Warning] Invalid Paystack signature.");
        return res.status(401).send("Invalid Signature");
      }
    }

    const event = req.body;

    if (event?.event === "charge.success") {
      const transactionData = event.data;
      const platform = transactionData?.metadata?.platform;

      // Idan an yi tagging din transaction a matsayin Marketplace kawai
      if (platform === "ayax_marketplace") {
        await creditMarketplaceWallet(transactionData);
      } else {
        // Duk wani Bank Transfer na DVA da biya na yau da kullum zai wuce kai tsaye zuwa Ayax Data Xpress
        console.log(`[Routing] Directing transaction ${transactionData.reference} to Ayax Data Xpress`);
        await forwardToDataXpress(transactionData);
      }
    }

    return res.status(200).send("Webhook Processed Successfully");
  } catch (error) {
    console.error("❌ Webhook Error:", error.message);
    return res.status(200).send("Acknowledged");
  }
};