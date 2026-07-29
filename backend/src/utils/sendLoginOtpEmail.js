const prisma = require("../config/prisma");

/* ======================================================
   CONSTANTS
====================================================== */

const LOGIN_OTP_EXPIRY_MINUTES = 10;

/* ======================================================
   SEND LOGIN OTP EMAIL
====================================================== */

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

    error.statusCode = 400;

    throw error;
  }

  const normalizedOtp = String(
    otp || ""
  ).trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    const error = new Error(
      "A valid 6-digit OTP is required."
    );

    error.statusCode = 400;

    throw error;
  }

  const formattedExpiry =
    expiresAt instanceof Date
      ? expiresAt.toISOString()
      : new Date(
          Date.now() +
            LOGIN_OTP_EXPIRY_MINUTES *
              60 *
              1000
        ).toISOString();

  const subject =
    "Your Ayax APIs login verification code";

  const body = `Hello ${user.name || "User"},

We received a request to sign in to your Ayax APIs account.

Your login verification code is:

${normalizedOtp}

This OTP expires in ${LOGIN_OTP_EXPIRY_MINUTES} minutes and can only be used once.

Security information:
Email: ${user.email}
IP Address: ${ipAddress || "Unknown"}
Expires At: ${formattedExpiry}

Do not share this OTP with anyone, including Ayax staff.

If you did not attempt to sign in, please change your password immediately and contact Ayax support.

Ayax APIs Security
Ayax Digital Solutions`;

  try {
    const emailLog =
      await prisma.emailLog.create({
        data: {
          to: user.email,
          subject,
          body,
          status: "PENDING",
        },
      });

    return {
      success: true,

      message:
        "Login OTP email has been queued successfully.",

      emailLogId: emailLog.id,
    };
  } catch (error) {
    console.error(
      "Login OTP email queue error:",
      error.message
    );

    const emailError = new Error(
      "Unable to queue login OTP email."
    );

    emailError.statusCode = 500;

    throw emailError;
  }
};

module.exports = {
  sendLoginOtpEmail,
};