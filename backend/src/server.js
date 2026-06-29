require("./config/env");

const http = require("http");

const app = require("./app");

const { initSocket } = require("./config/socket");
const { connectRedis } = require("./config/redis");
const startJobs = require("./jobs");

const PORT = Number(process.env.PORT) || 5000;

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Connect Redis
// connectRedis();

// Start HTTP Server
server.listen(PORT, () => {
  console.log(`
==========================================
🚀 AYAX API MARKETPLACE BACKEND
==========================================
Environment : ${process.env.NODE_ENV}
Port        : ${PORT}
Socket.IO   : Enabled
Redis       : Initializing...
Jobs        : Starting...
==========================================
  `);

  startJobs();
});

// Handle unexpected errors
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});