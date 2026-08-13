const crypto = require("crypto");

exports.generateReloadlyReference = (prefix = "RELOADLY") => {
  return `${prefix}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

exports.getReloadlyBaseUrl = () => {
  return process.env.RELOADLY_BASE_URL || "https://topups-sandbox.reloadly.com";
};

exports.getReloadlyAuthUrl = () => {
  return process.env.RELOADLY_AUTH_URL || "https://auth.reloadly.com";
};