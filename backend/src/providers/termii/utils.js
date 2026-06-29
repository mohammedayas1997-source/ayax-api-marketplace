const crypto = require("crypto");

exports.generateTermiiReference = (prefix = "TERMII") => {
  return `${prefix}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

exports.getTermiiBaseUrl = () => {
  return process.env.TERMII_BASE_URL || "https://api.ng.termii.com/api";
};