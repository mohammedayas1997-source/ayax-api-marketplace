// src/helpers/decryptApiKey.js ko helpers/decryptApiKey.js
const crypto = require("crypto");

module.exports = function decryptApiKey(encryptedText) {
  if (!encryptedText || typeof encryptedText !== "string") {
    return encryptedText || "";
  }

  // Idan plain text ne (ba shi da IV separator kamar ":")
  if (!encryptedText.includes(":")) {
    return encryptedText;
  }

  try {
    const textParts = encryptedText.split(":");
    const ivHex = textParts.shift();
    const encryptedData = textParts.join(":");

    const iv = Buffer.from(ivHex, "hex");
    if (iv.length !== 16) {
      return encryptedText; // Ba daidaitaccen IV bane, dawo da shi a matsayin plain text
    }

    const secret =
      process.env.ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      "default_secret_key_32_bytes_len";

    const key = crypto
      .createHash("sha256")
      .update(String(secret))
      .digest();

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // Idan decryption ya fadi, dawo da ainihin string din
    return encryptedText;
  }
};