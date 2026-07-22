const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

const getEncryptionKey = () => {
  const secret = process.env.PARTNER_CREDENTIAL_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      "PARTNER_CREDENTIAL_ENCRYPTION_KEY is not configured"
    );
  }

  return crypto
    .createHash("sha256")
    .update(String(secret))
    .digest();
};

const encryptCredential = (plainText) => {
  if (
    plainText === undefined ||
    plainText === null ||
    String(plainText).trim() === ""
  ) {
    return null;
  }

  const key = getEncryptionKey();
  const initializationVector = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    key,
    initializationVector
  );

  const encrypted = Buffer.concat([
    cipher.update(String(plainText), "utf8"),
    cipher.final(),
  ]);

  const authenticationTag = cipher.getAuthTag();

  return {
    encryptedValue: encrypted.toString("base64"),
    initializationVector:
      initializationVector.toString("base64"),
    authenticationTag:
      authenticationTag.toString("base64"),
  };
};

const decryptCredential = ({
  encryptedValue,
  initializationVector,
  authenticationTag,
}) => {
  if (
    !encryptedValue ||
    !initializationVector ||
    !authenticationTag
  ) {
    return null;
  }

  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(initializationVector, "base64")
  );

  decipher.setAuthTag(
    Buffer.from(authenticationTag, "base64")
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(encryptedValue, "base64")
    ),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

const maskCredential = (value) => {
  if (!value) return null;

  const text = String(value);

  if (text.length <= 6) {
    return "******";
  }

  return `${text.slice(0, 3)}******${text.slice(-3)}`;
};

module.exports = {
  encryptCredential,
  decryptCredential,
  maskCredential,
};