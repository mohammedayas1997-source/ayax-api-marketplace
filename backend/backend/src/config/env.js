require("dotenv").config();

const requiredEnv = [
  "JWT_SECRET",
];

const optionalEnv = {
  NODE_ENV: "development",
  PORT: "5000",
  JWT_EXPIRES_IN: "7d",
  SUPER_ADMIN_PIN: "123456",

  REDIS_HOST: "127.0.0.1",
  REDIS_PORT: "6379",
  REDIS_PASSWORD: "",

  API_KEY_ENCRYPTION_SECRET:
    "ayax-super-secret-key-change-this-in-production",

  MONNIFY_BASE_URL: "https://sandbox.monnify.com",
  PAYSTACK_BASE_URL: "https://api.paystack.co",
  FLUTTERWAVE_BASE_URL: "https://api.flutterwave.com/v3",
  VTPASS_BASE_URL: "https://sandbox.vtpass.com/api",
  RELOADLY_BASE_URL: "https://topups-sandbox.reloadly.com",
  RELOADLY_AUTH_URL: "https://auth.reloadly.com",
  TERMII_BASE_URL: "https://api.ng.termii.com/api",
};

Object.entries(optionalEnv).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.warn(
    `Missing environment variables: ${missing.join(", ")}`
  );
}

module.exports = {
  env: process.env.NODE_ENV,
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  superAdminPin: process.env.SUPER_ADMIN_PIN,
};