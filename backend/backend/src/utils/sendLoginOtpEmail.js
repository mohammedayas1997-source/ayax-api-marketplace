const prisma = require("../config/prisma");
const sendEmail = require("./sendEmail");

const LOGIN_OTP_EXPIRY_MINUTES = 10;
const EMAIL_TIMEOUT_MS = 30000;

const normalizeText = (value) =>
  String(value || "").trim();

const createTimeoutError = () => {
  const error = new Error(
    `Email request timed out after ${
      EMAIL_TIMEOUT_MS / 1000
    } seconds.`
  );

  error.name = "EmailTimeoutError";
  error.code = "EMAIL_TIMEOUT";
  error.statusCode = 504;

  return error;
};

const sendLoginOtpEmail = async ({
  user,
  otp,
  expiresAt,
  ipAddress,
}) => {
  if (!user?.id || !user?.email) {
    const error = new Error(
      "A valid user is required to send login OTP."
    );

    error.code = "INVALID_EMAIL_RECIPIENT";
    error.statusCode = 400;

    throw error;
  }

  const normalizedOtp =
    normalizeText(otp);

  if (!/^\d{6}$/.test(normalizedOtp)) {
    const error = new Error(
      "A valid 6-digit OTP is required."
    );

    error.code = "INVALID_LOGIN_OTP";
    error.statusCode = 400;

    throw error;
  }

  const recipientEmail =
    normalizeText(user.email).toLowerCase();

  const recipientName =
    normalizeText(user.name) || "User";

  const subject =
    "Your Ayax APIs login verification code";

  const text = `Hello ${recipientName},

Your Ayax APIs login verification code is:

${normalizedOtp}

This code expires in ${LOGIN_OTP_EXPIRY_MINUTES} minutes and can only be used once.

IP Address: ${ipAddress || "Unknown"}

Do not share this code with anyone, including Ayax staff.

Ayax APIs Security`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>Login Verification</title>
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f8fafc;
          font-family:Arial,sans-serif;
          color:#0f172a;
        "
      >
        <div
          style="
            max-width:520px;
            margin:32px auto;
            padding:28px;
            background:#ffffff;
            border:1px solid #e2e8f0;
            border-radius:14px;
          "
        >
          <h2
            style="
              margin:0 0 8px;
              font-size:24px;
              color:#0f172a;
            "
          >
            Login Verification
          </h2>

          <p>Hello ${recipientName},</p>

          <p>
            Use the verification code below to
            complete your Ayax APIs login.
          </p>

          <div
            style="
              margin:24px 0;
              padding:20px;
              background:#f1f5f9;
              border-radius:12px;
              text-align:center;
              font-size:32px;
              font-weight:700;
              letter-spacing:8px;
              color:#0f172a;
            "
          >
            ${normalizedOtp}
          </div>

          <p>
            This code expires in
            <strong>
              ${LOGIN_OTP_EXPIRY_MINUTES} minutes
            </strong>
            and can only be used once.
          </p>

          <p>
            <strong>IP Address:</strong>
            ${ipAddress || "Unknown"}
          </p>

          <p
            style="
              padding:12px;
              background:#fff7ed;
              border-radius:8px;
              color:#9a3412;
            "
          >
            Do not share this code with anyone,
            including Ayax staff.
          </p>

          <p style="margin-top:24px;">
            Ayax APIs Security
          </p>
        </div>
      </body>
    </html>
  `;

  let emailLog = null;
  let timeoutId = null;

  try {
    emailLog =
      await prisma.emailLog.create({
        data: {
          to: recipientEmail,
          subject,
          body: text,
          status: "PENDING",
        },
      });

    const timeoutPromise =
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(createTimeoutError());
        }, EMAIL_TIMEOUT_MS);
      });

    const emailResult =
      await Promise.race([
        sendEmail({
          to: recipientEmail,
          subject,
          text,
          html,
        }),

        timeoutPromise,
      ]);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    await prisma.emailLog.update({
      where: {
        id: emailLog.id,
      },

      data: {
        status: "SENT",
      },
    });

    console.log(
      "LOGIN OTP EMAIL SENT:",
      {
        userId: user.id,
        email: recipientEmail,
        emailLogId: emailLog.id,
        messageId:
          emailResult?.messageId ||
          null,
      }
    );

    return {
      success: true,

      message:
        "Login OTP email sent successfully.",

      emailLogId:
        emailLog.id,

      messageId:
        emailResult?.messageId ||
        null,

      expiresAt,
    };
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    console.error(
      "LOGIN OTP EMAIL ERROR:",
      {
        userId: user?.id,
        email: recipientEmail,

        name:
          error?.name,

        code:
          error?.code,

        statusCode:
          error?.statusCode,

        message:
          error?.message,

        command:
          error?.command,

        response:
          error?.response,

        responseCode:
          error?.responseCode,

        syscall:
          error?.syscall,

        address:
          error?.address,

        port:
          error?.port,

        stack:
          error?.stack,
      }
    );

    if (emailLog?.id) {
      try {
        await prisma.emailLog.update({
          where: {
            id: emailLog.id,
          },

          data: {
            status: "FAILED",
          },
        });
      } catch (logError) {
        console.error(
          "Unable to update failed email log:",
          logError.message
        );
      }
    }

    const emailError =
      new Error(
        error?.message ||
          "Unable to send login OTP email."
      );

    emailError.name =
      error?.name ||
      "LoginOtpEmailError";

    emailError.code =
      error?.code ||
      "LOGIN_OTP_EMAIL_FAILED";

    emailError.statusCode =
      Number(error?.statusCode) ||
      Number(error?.responseCode) ||
      500;

    emailError.originalError = {
      name: error?.name || null,
      code: error?.code || null,
      message: error?.message || null,
      command: error?.command || null,
      response: error?.response || null,
      responseCode:
        error?.responseCode || null,
    };

    throw emailError;
  }
};

module.exports = {
  sendLoginOtpEmail,
};