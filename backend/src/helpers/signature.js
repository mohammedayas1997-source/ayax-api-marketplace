const crypto = require("crypto");

exports.createSignature = (payload, secret) => {
  const data =
    typeof payload === "string"
      ? payload
      : JSON.stringify(payload);

  return crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");
};

exports.verifySignature = (payload, signature, secret) => {
  const expectedSignature = exports.createSignature(payload, secret);

  return crypto.timingSafeEqual(
    Buffer.from(signature || ""),
    Buffer.from(expectedSignature)
  );
};