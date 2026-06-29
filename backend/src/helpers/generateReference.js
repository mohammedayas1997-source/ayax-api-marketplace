const crypto = require("crypto");

module.exports = function generateReference(prefix = "AYAX") {
  return `${prefix}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};