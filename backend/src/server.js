require("./config/env");

const http = require("http");

const app = require("./app");

const { initSocket } = require("./config/socket");
const { connectRedis } = require("./config/redis");
const startJobs = require("./jobs");

const PORT = Number(process.env.PORT) || 5000;

const server = http.createServer(app);

/**
 * ============================================
 * Graceful shutdown
 * ============================================
 */

let shuttingDown = false;

const shutdown = async (signal, error = null) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (error) {
    console.error(`${signal}:`, error);
  } else {
    console.log(`${signal} received. Shutting down...`);
  }

  server.close((closeError) => {
    if (closeError) {
      console.error(
        "HTTP server close error:",
        closeError
      );

      process.exit(1);
    }

    console.log("HTTP server closed.");

    process.exit(error ? 1 : 0);
  });

  /*
   * Kada process ya tsaya har abada idan
   * wani connection bai rufe ba.
   */
  setTimeout(() => {
    console.error(
      "Forced shutdown after timeout."
    );

    process.exit(error ? 1 : 0);
  }, 10000).unref();
};

/**
 * ============================================
 * Start application
 * ============================================
 */

const startServer = async () => {
  try {
    // Initialize Socket.IO
    initSocket(server);

    /*
     * Connect Redis only when explicitly enabled.
     * A Render environment variable can be:
     *
     * REDIS_ENABLED=true
     */
    const redisEnabled =
      String(
        process.env.REDIS_ENABLED || "false"
      ).toLowerCase() === "true";

    if (redisEnabled) {
      try {
        await connectRedis();

        console.log(
          "Redis connected successfully."
        );
      } catch (redisError) {
        console.error(
          "Redis connection failed:",
          redisError
        );

        /*
         * Redis failure should not stop the whole API
         * unless your application strictly depends on it.
         */
      }
    } else {
      console.log(
        "Redis is disabled."
      );
    }

    server.listen(PORT, () => {
      console.log(`
==========================================
🚀 AYAX API MARKETPLACE BACKEND
==========================================
Environment : ${process.env.NODE_ENV || "development"}
Port        : ${PORT}
Socket.IO   : Enabled
Redis       : ${redisEnabled ? "Enabled" : "Disabled"}
Jobs        : Starting
==========================================
      `);

      try {
        startJobs();

        console.log(
          "Background jobs started successfully."
        );
      } catch (jobsError) {
        console.error(
          "Unable to start background jobs:",
          jobsError
        );
      }
    });
  } catch (error) {
    console.error(
      "Server startup error:",
      error
    );

    process.exit(1);
  }
};

startServer();

/**
 * ============================================
 * Process error handlers
 * ============================================
 */

process.on(
  "unhandledRejection",
  (error) => {
    shutdown(
      "Unhandled Rejection",
      error
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    shutdown(
      "Uncaught Exception",
      error
    );
  }
);

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});