const crypto = require("crypto");

exports.generateMonnifyReference = (prefix = "MONNIFY") => {
  return `${prefix}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

exports.getMonnifyBaseUrl = () => {
  return process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com";
};