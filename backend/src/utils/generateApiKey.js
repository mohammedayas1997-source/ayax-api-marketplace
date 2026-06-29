const crypto = require("crypto");

module.exports = function generateApiKey(prefix = "ayax_live") {
  return `${prefix}_${crypto.randomBytes(32).toString("hex")}`;
};