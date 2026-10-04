const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

class AutoSyncWebhookController {
  /**
   * Handle Webhook Callbacks from AutoSyncNG
   * URL: POST /api/v1/webhook/autosync
   */
  async handleWebhook(req, res) {
    try {
      const { hash, transaction } = req.body || {};

      if (!transaction) {
        return res.status(400).send("error");
      }

      const reference = transaction.reference || transaction.ref;
      const status = String(transaction.status || "").toLowerCase();

      // Verify SHA256 Signature if PIN is configured
      const myPin = process.env.AUTOSYNC_PIN;
      if (myPin && hash) {
        const expectedHash = crypto
          .createHash("sha256")
          .update(`${myPin}:${reference}`)
          .digest("hex");

        if (hash !== expectedHash) {
          console.warn(`[AutoSync Webhook] Hash mismatch for ref: ${reference}`);
          return res.status(400).send("error");
        }
      }

      // Update the local database transaction
      const localTx = await prisma.transaction.findUnique({
        where: { reference: String(reference) },
      });

      if (localTx) {
        if (status === "successful" || status === "success" || status === "delivered") {
          await prisma.transaction.update({
            where: { reference: String(reference) },
            data: {
              status: "SUCCESSFUL",
              gatewayResponse: JSON.stringify(transaction),
            },
          });
        } else if (status === "failed" || status === "rejected") {
          // If marked failed via webhook and previously charged, refund
          if (localTx.status !== "FAILED") {
            await prisma.$transaction([
              prisma.user.update({
                where: { id: localTx.userId },
                data: { walletBalance: { increment: localTx.amount } },
              }),
              prisma.transaction.update({
                where: { reference: String(reference) },
                data: {
                  status: "FAILED",
                  gatewayResponse: JSON.stringify(transaction),
                },
              }),
            ]);
          }
        }
      }

      // AutoSyncNG expects raw string 'ok'
      return res.status(200).send("ok");
    } catch (err) {
      console.error("[AutoSync Webhook Error]:", err.message);
      return res.status(500).send("error");
    }
  }
}

module.exports = new AutoSyncWebhookController();
