let Worker = null;
let connection = null;

try {
  Worker = require("bullmq").Worker;

  connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  };
} catch (error) {
  console.warn("BullMQ not installed. Transaction worker disabled.");
}

const transactionService = require("../services/transaction.service");
const { emitEvent } = require("../config/socket");

exports.startTransactionWorker = () => {
  if (!Worker || !connection) {
    console.log("Transaction worker running in disabled fallback mode.");
    return null;
  }

  const worker = new Worker(
    "transactions",
    async (job) => {
      const { reference, action, payload } = job.data || {};

      if (action === "MARK_SUCCESS" && reference) {
        const trx = await transactionService.updateTransactionStatus({
          reference,
          status: "SUCCESSFUL",
          description: "Processed by queue worker",
        });

        emitEvent("transaction-processed", trx);

        return trx;
      }

      if (action === "MARK_FAILED" && reference) {
        const trx = await transactionService.updateTransactionStatus({
          reference,
          status: "FAILED",
          description: payload?.message || "Failed by queue worker",
        });

        emitEvent("transaction-failed", trx);

        return trx;
      }

      return {
        ok: true,
        message: "No matching queue action",
      };
    },
    { connection }
  );

  worker.on("completed", (job) => {
    console.log(`Transaction job completed: ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Transaction job failed: ${job?.id}`, err.message);
  });

  return worker;
};