const prisma = require("../config/prisma");
const sendEmail = require("./sendEmail");

const LOGIN_OTP_EXPIRY_MINUTES = 10;

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

  const normalizedOtp =
    String(otp || "").trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    const error = new Error(
      "A valid 6-digit OTP is required."
    );

    error.statusCode = 400;
    throw error;
  }

  const subject =
    "Your Ayax APIs login verification code";

  const text = `Hello ${user.name || "User"},

Your Ayax APIs login verification code is:

${normalizedOtp}

This code expires in ${LOGIN_OTP_EXPIRY_MINUTES} minutes.

IP Address: ${ipAddress || "Unknown"}

Do not share this code with anyone.`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="margin-bottom:8px">Login Verification</h2>

      <p>Hello ${user.name || "User"},</p>

      <p>Use this code to complete your Ayax APIs login:</p>

      <div style="
        margin:24px 0;
        padding:18px;
        background:#f1f5f9;
        border-radius:12px;
        text-align:center;
        font-size:32px;
        font-weight:700;
        letter-spacing:8px;
      ">
        ${normalizedOtp}
      </div>

      <p>
        This code expires in
        ${LOGIN_OTP_EXPIRY_MINUTES} minutes
        and can only be used once.
      </p>

      <p>
        IP Address:
        ${ipAddress || "Unknown"}
      </p>

      <p>
        Do not share this code with anyone,
        including Ayax staff.
      </p>

      <p>Ayax APIs Security</p>
    </div>
  `;

  let emailLog = null;

  try {
    emailLog =
      await prisma.emailLog.create({
        data: {
          to: user.email,
          subject,
          body: text,
          status: "PENDING",
        },
      });

    const emailTimeout = new Promise((_, reject) => {
  setTimeout(() => {
    const error = new Error(
      "SMTP request timed out after 30 seconds."
    );

    error.code = "SMTP_TIMEOUT";

    reject(error);
  }, 30000);
});

await Promise.race([
  sendEmail({
    to: user.email,
    subject,
    text,
    html,
  }),

  emailTimeout,
]);

    await prisma.emailLog.update({
      where: {
        id: emailLog.id,
      },

      data: {
        status: "SENT",
      },
    });

    return {
      success: true,
      message:
        "Login OTP email sent successfully.",
      emailLogId: emailLog.id,
      expiresAt,
    };
  } catch (error) {
    console.error(
      "Login OTP email error:",
      error
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

    const emailError = new Error(
      "Unable to send login OTP email."
    );

    emailError.statusCode = 500;
    throw emailError;
  }
};

module.exports = {
  sendLoginOtpEmail,
};