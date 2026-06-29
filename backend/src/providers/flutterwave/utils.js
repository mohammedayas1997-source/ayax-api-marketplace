const crypto = require("crypto");

exports.generateFlutterwaveReference = (prefix = "FLW") => {
  return `${prefix}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

exports.getFlutterwaveBaseUrl = () => {
  return process.env.FLUTTERWAVE_BASE_URL || "https://api.flutterwave.com/v3";
};