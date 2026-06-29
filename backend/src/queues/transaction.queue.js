let Queue = null;
let connection = null;

try {
  Queue = require("bullmq").Queue;

  connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  };
} catch (error) {
  console.warn("BullMQ not installed. Transaction queue will run in fallback mode.");
}

const fallbackJobs = [];

const transactionQueue =
  Queue && connection
    ? new Queue("transactions", { connection })
    : null;

exports.addTransactionJob = async (name, payload = {}, options = {}) => {
  if (!transactionQueue) {
    fallbackJobs.push({
      name,
      payload,
      options,
      createdAt: new Date(),
    });

    return {
      id: `fallback-${Date.now()}`,
      name,
      payload,
      fallback: true,
    };
  }

  return transactionQueue.add(name, payload, {
    attempts: options.attempts || 3,
    backoff: {
      type: "exponential",
      delay: options.delay || 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
    ...options,
  });
};

exports.getTransactionQueue = () => transactionQueue;

exports.getFallbackJobs = () => fallbackJobs;