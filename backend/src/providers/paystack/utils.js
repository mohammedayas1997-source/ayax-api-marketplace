const crypto = require("crypto");

exports.generatePaystackReference = (prefix = "PAYSTACK") => {
  return `${prefix}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

exports.getPaystackBaseUrl = () => {
  return process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";
};