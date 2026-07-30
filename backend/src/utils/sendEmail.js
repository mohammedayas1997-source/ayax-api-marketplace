const nodemailer = require("nodemailer");

const requiredEnvVariables = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
];

const normalizeText = (value) =>
  String(value || "").trim();

const validateEmailConfiguration = () => {
  const missingVariables =
    requiredEnvVariables.filter(
      (variableName) =>
        !normalizeText(
          process.env[variableName]
        )
    );

  if (missingVariables.length > 0) {
    const error = new Error(
      `Missing email configuration: ${missingVariables.join(
        ", "
      )}`
    );

    error.code =
      "EMAIL_CONFIGURATION_MISSING";

    throw error;
  }
};

let transporter = null;

const createTransporter = () => {
  validateEmailConfiguration();

  if (transporter) {
    return transporter;
  }

  const port = Number(
    process.env.SMTP_PORT || 587
  );

  const secure =
    normalizeText(
      process.env.SMTP_SECURE
    ).toLowerCase() === "true";

  transporter =
    nodemailer.createTransport({
      host: normalizeText(
        process.env.SMTP_HOST
      ),

      port,
      secure,

      auth: {
        user: normalizeText(
          process.env.SMTP_USER
        ),

        pass: normalizeText(
          process.env.SMTP_PASS
        ),
      },

      requireTLS:
        port === 587 && !secure,

      connectionTimeout: 20000,
      greetingTimeout: 15000,
      socketTimeout: 30000,

      tls: {
        minVersion: "TLSv1.2",
      },
    });

  return transporter;
};

const sendEmail = async ({
  to,
  subject,
  text,
  html,
  replyTo,
}) => {
  const normalizedTo =
    normalizeText(to);

  const normalizedSubject =
    normalizeText(subject);

  if (
    !normalizedTo ||
    !normalizedSubject
  ) {
    const error = new Error(
      "Email recipient and subject are required."
    );

    error.statusCode = 400;
    throw error;
  }

  const mailTransporter =
    createTransporter();

  const from =
    normalizeText(
      process.env.EMAIL_FROM
    ) ||
    `"Ayax APIs" <${normalizeText(
      process.env.SMTP_USER
    )}>`;

  try {
    const info =
      await mailTransporter.sendMail({
        from,
        to: normalizedTo,
        subject: normalizedSubject,
        text:
          typeof text === "string"
            ? text
            : undefined,

        html:
          typeof html === "string"
            ? html
            : undefined,

        replyTo:
          normalizeText(replyTo) ||
          undefined,
      });

    console.log(
      "Email sent successfully:",
      {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      }
    );

    return info;
  } catch (error) {
    console.error(
      "SMTP send error:",
      {
        name: error.name,
        code: error.code,
        command: error.command,
        responseCode:
          error.responseCode,
        response:
          error.response,
        message:
          error.message,
      }
    );

    throw error;
  }
};

module.exports = sendEmail;