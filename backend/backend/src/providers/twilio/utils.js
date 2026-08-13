const crypto = require("crypto");

exports.generateTwilioReference = (prefix = "TWILIO") => {
  return `${prefix}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};