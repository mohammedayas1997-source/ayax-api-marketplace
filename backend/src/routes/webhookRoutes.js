const express = require("express");
const router = express.Router();

const { handlePaystackWebhook } = require("../controllers/webhookController");

router.post("/paystack", handlePaystackWebhook);

module.exports = router;