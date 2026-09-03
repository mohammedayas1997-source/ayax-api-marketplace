const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.SMTP_PORT) || 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465, // true don 465, false don 587 ko sauran
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Yana hana matsalar self-signed SSL a wasu cPanel hosts
  },
});

/**
 * Tura saƙon sauya kalmar sirri (Password Reset OTP)
 */
const sendPasswordResetEmail = async ({ user, otp, resetUrl, expiresInMinutes = 15 }) => {
  try {
    const mailOptions = {
      from: `"Ayax API Marketplace" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `${otp ? otp + " is your " : ""}Password Reset Code - Ayax API Marketplace`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #f8fafc; color: #0f172a;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0284c7; text-align: center;">Reset Your Password</h2>
            <p>Hello <strong>${user.name || "User"}</strong>,</p>
            <p>We received a request to reset the password for your Ayax API Marketplace account.</p>
            
            ${
              otp
                ? `
            <p>Use the 6-digit verification code below to authorize your password change:</p>
            <div style="text-align: center; margin: 25px 0;">
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #dc2626; background: #fef2f2; padding: 12px 24px; border-radius: 8px; border: 1px dashed #f87171; display: inline-block;">
                ${otp}
              </span>
            </div>
            `
                : ""
            }

            ${
              resetUrl
                ? `
            <div style="text-align: center; margin-top: 15px;">
              <a href="${resetUrl}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            `
                : ""
            }

            <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
              This code will expire in <strong>${expiresInMinutes} minutes</strong>. If you did not make this request, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to: ${user.email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error.message);
    throw error;
  }
};

/**
 * Tura saƙon faɗakarwa lokacin da aka yi nasarar shiga asusu (Login Alert)
 */
const sendLoginAlertEmail = async ({ user, ipAddress, userAgent, loggedInAt }) => {
  try {
    const time = loggedInAt ? new Date(loggedInAt).toUTCString() : new Date().toUTCString();

    const mailOptions = {
      from: `"Ayax API Marketplace" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Security Alert: Successful Login to Ayax Marketplace",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #f8fafc; color: #0f172a;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0284c7;">Security Notification</h2>
            <p>Hello <strong>${user.name || "User"}</strong>,</p>
            <p>A new login session was established on your Ayax API Marketplace account.</p>
            
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 13px;">
              <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${time}</p>
              <p style="margin: 4px 0;"><strong>IP Address:</strong> ${ipAddress || "Unknown"}</p>
              <p style="margin: 4px 0;"><strong>Client / Browser:</strong> ${userAgent || "Unknown"}</p>
            </div>

            <p style="color: #dc2626; font-size: 12px; font-weight: bold;">
              If this was not authorized by you, please reset your password immediately or reach out to our security desk.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Login alert email sent to: ${user.email}`);
  } catch (error) {
    console.error("Error sending login alert email:", error.message);
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendLoginAlertEmail,
};