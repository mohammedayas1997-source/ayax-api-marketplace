const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Ayax API Marketplace backend is running",
    status: "HEALTHY",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

module.exports = router;