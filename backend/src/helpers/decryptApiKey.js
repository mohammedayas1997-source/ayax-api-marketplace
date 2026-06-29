const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";

const SECRET =
  process.env.API_KEY_ENCRYPTION_SECRET ||
  "ayax-super-secret-key-change-this-in-production";

const KEY = crypto
  .createHash("sha256")
  .update(SECRET)
  .digest();

module.exports = function decryptApiKey(
  encryptedText
) {
  if (!encryptedText) return null;

  const parts =
    encryptedText.split(":");

  const iv = Buffer.from(
    parts.shift(),
    "hex"
  );

  const encrypted =
    parts.join(":");

  const decipher =
    crypto.createDecipheriv(
      ALGORITHM,
      KEY,
      iv
    );

  let decrypted =
    decipher.update(
      encrypted,
      "hex",
      "utf8"
    );

  decrypted += decipher.final(
    "utf8"
  );

  return decrypted;
};