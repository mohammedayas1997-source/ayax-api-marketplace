const crypto = require("crypto");

const generateReference = (prefix = "AYAX") => {
  return `${prefix}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

module.exports = generateReference;