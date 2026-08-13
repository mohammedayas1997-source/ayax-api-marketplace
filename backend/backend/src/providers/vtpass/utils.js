const crypto = require("crypto");

exports.generateVtpassReference = (prefix = "VTPASS") => {
  return `${prefix}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

exports.getVtpassBaseUrl = () => {
  return process.env.VTPASS_BASE_URL || "https://sandbox.vtpass.com/api";
};