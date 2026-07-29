const nodemailer = require("nodemailer");

const requiredEnvVariables = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
];

const validateEmailConfiguration = () => {
  const missingVariables =
    requiredEnvVariables.filter(
      (variableName) =>
        !String(
          process.env[variableName] || ""
        ).trim()
    );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing email configuration: ${missingVariables.join(
        ", "
      )}`
    );
  }
};

const createTransporter = () => {
  validateEmailConfiguration();

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,

    port: Number(
      process.env.SMTP_PORT || 587
    ),

    secure:
      process.env.SMTP_SECURE === "true",

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async ({
  to,
  subject,
  text,
  html,
}) => {
  if (!to || !subject) {
    throw new Error(
      "Email recipient and subject are required."
    );
  }

  const transporter =
    createTransporter();

  await transporter.verify();

  return transporter.sendMail({
    from:
      process.env.EMAIL_FROM ||
      `"Ayax APIs" <${process.env.SMTP_USER}>`,

    to,
    subject,
    text,
    html,
  });
};

module.exports = sendEmail;