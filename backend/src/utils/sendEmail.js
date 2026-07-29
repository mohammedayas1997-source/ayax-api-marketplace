const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendLoginOtpEmail = async ({
  email,
  name,
  otp,
}) => {
  await transporter.sendMail({
    from:
      process.env.EMAIL_FROM ||
      `"Ayax APIs" <${process.env.SMTP_USER}>`,

    to: email,

    subject: "Your Ayax Login OTP",

    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2>Login Verification</h2>

        <p>Hello ${name || "User"},</p>

        <p>Use this OTP to complete your login:</p>

        <div style="
          font-size:32px;
          font-weight:700;
          letter-spacing:8px;
          padding:18px;
          background:#f1f5f9;
          text-align:center;
          border-radius:12px;
        ">
          ${otp}
        </div>

        <p>This OTP will expire in 10 minutes.</p>

        <p>If you did not attempt to log in, please change your password.</p>
      </div>
    `,
  });
};

module.exports = {
  sendLoginOtpEmail,
};