const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // Misali: mail.ayaxdigital.solutions
  port: process.env.SMTP_PORT || 465, // Yawanci 465 (SSL) ko 587 (TLS)
  secure: true,                      // True don 465, false don sauran
  auth: {
    user: process.env.EMAIL_USER,    // Imel ɗinka na custom domain (misali: support@ayaxdigital.solutions)
    pass: process.env.EMAIL_PASS,    // Password na wancan imel ɗin
  },
});

// Sauran ayyukan sendPasswordResetEmail da sendLoginAlertEmail 
// za su cigaba da aiki da wannan transporter ɗin ba tare da wani canji ba.

/**
 * Tura saƙon sauya kalmar sirri (Password Reset)
 */
const sendPasswordResetEmail = async ({ user, resetUrl }) => {
  try {
    const mailOptions = {
      from: `"Ayax API Marketplace" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request - Ayax API Marketplace",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Hello, ${user.name || "User"}</h2>
          <p>We received a request to reset the password for your account.</p>
          <p>Please click the button below to set a new password:</p>
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Reset Password</a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">If you did not request this, please ignore this email. This link will expire in 15 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to: ${user.email}`);
  } catch (error) {
    console.error("Error sending password reset email via Gmail:", error.message);
    throw error;
  }
};

/**
 * Tura saƙon gargadi lokacin da aka yi nasarar shiga asusu (Login Alert)
 */
const sendLoginAlertEmail = async ({ user, ipAddress, userAgent }) => {
  try {
    const time = new Date().toUTCString();
    
    const mailOptions = {
      from: `"Ayax API Marketplace" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Security Alert: New Login to Your Account",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Hello, ${user.name || "User"}</h2>
          <p>We noticed a successful login to your Ayax API Marketplace account.</p>
          <ul style="list-style: none; padding: 0; background: #f9f9f9; padding: 15px; border-radius: 5px;">
            <li><strong>Time:</strong> ${time}</li>
            <li><strong>IP Address:</strong> ${ipAddress || "Unknown"}</li>
            <li><strong>Device/Browser:</strong> ${userAgent || "Unknown"}</li>
          </ul>
          <p style="color: #d9534f; font-weight: bold; margin-top: 15px;">If this was not you, please secure your account immediately by changing your password or contacting support.</p>
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