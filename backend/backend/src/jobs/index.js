const cron = require("node-cron");

const {
  retryFailedTransactions,
} = require("./retryFailedTransactions");

const {
  runProviderHealthChecker,
} = require("./providerHealthChecker");

const {
  runWalletSettlement,
} = require("./walletSettlement");

module.exports = () => {

  console.log("✅ Background Jobs Started");

  /**
   * Every 5 Minutes
   */
  cron.schedule("*/5 * * * *", async () => {
    console.log("Retry Failed Transactions");

    await retryFailedTransactions();
  });

  /**
   * Every 10 Minutes
   */
  cron.schedule("*/10 * * * *", async () => {
    console.log("Checking Providers");

    await runProviderHealthChecker();
  });

  /**
   * Every Hour
   */
  cron.schedule("0 * * * *", async () => {
    console.log("Wallet Settlement");

    await runWalletSettlement();
  });

};