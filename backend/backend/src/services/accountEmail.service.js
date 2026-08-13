const prisma = require("../config/prisma");
const sendEmail = require("../utils/sendEmail");

const FRONTEND_URL = String(
  process.env.FRONTEND_URL ||
    "https://www.ayaxapis.com"
)
  .trim()
  .replace(/\/+$/, "");

/* ======================================================
   HELPERS
====================================================== */

const formatMoney = (value) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
};

const formatDate = (
  value = new Date()
) => {
  try {
    return new Intl.DateTimeFormat(
      "en-NG",
      {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone:
          "Africa/Lagos",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return new Date(
      value
    ).toISOString();
  }
};

const escapeHtml = (value) => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const updateEmailLog = async (
  emailLogId,
  status
) => {
  if (!emailLogId) {
    return;
  }

  try {
    await prisma.emailLog.update({
      where: {
        id: emailLogId,
      },

      data: {
        status,
      },
    });
  } catch (error) {
    console.error(
      "Email log update error:",
      error.message
    );
  }
};

const deliverEmail = async ({
  to,
  subject,
  text,
  html,
}) => {
  if (!to) {
    const error = new Error(
      "Recipient email is required."
    );

    error.statusCode = 400;
    throw error;
  }

  let emailLog = null;

  try {
    emailLog =
      await prisma.emailLog.create({
        data: {
          to,
          subject,
          body: text,
          status: "PENDING",
        },
      });

    await sendEmail({
      to,
      subject,
      text,
      html,
    });

    await updateEmailLog(
      emailLog.id,
      "SENT"
    );

    return {
      success: true,
      emailLogId:
        emailLog.id,
    };
  } catch (error) {
    await updateEmailLog(
      emailLog?.id,
      "FAILED"
    );

    console.error(
      "Automatic email delivery error:",
      {
        to,
        subject,
        name:
          error?.name,
        code:
          error?.code,
        message:
          error?.message,
      }
    );

    throw error;
  }
};

/* ======================================================
   WELCOME EMAIL
====================================================== */

const sendWelcomeEmail = async ({
  user,
}) => {
  if (!user?.email) {
    const error = new Error(
      "A valid user email is required."
    );

    error.statusCode = 400;
    throw error;
  }

  const name =
    user.name ||
    "Developer";

  const subject =
    "Welcome to Ayax APIs";

  const dashboardUrl =
    `${FRONTEND_URL}/dashboard`;

  const text = `Hello ${name},

Welcome to Ayax APIs Developer Marketplace.

Your account has been created successfully.

You can now:

- Fund your wallet
- Generate secure API keys
- Access API documentation
- Track your transactions
- Monitor your API usage

Open your dashboard:

${dashboardUrl}

For your security, do not share your password or API key with anyone.

Thank you for choosing Ayax Digital Solutions.`;

  const html = `
    <div
      style="
        font-family: Arial, sans-serif;
        max-width: 620px;
        margin: auto;
        padding: 24px;
        color: #0f172a;
        line-height: 1.6;
      "
    >
      <h2
        style="
          margin-bottom: 8px;
        "
      >
        Welcome to Ayax APIs
      </h2>

      <p>
        Hello ${escapeHtml(name)},
      </p>

      <p>
        Welcome to Ayax APIs Developer Marketplace.
        Your account has been created successfully.
      </p>

      <div
        style="
          background: #f8fafc;
          border-radius: 12px;
          padding: 18px;
          margin: 20px 0;
        "
      >
        <strong>
          You can now:
        </strong>

        <ul>
          <li>
            Fund your wallet
          </li>

          <li>
            Generate secure API keys
          </li>

          <li>
            Access API documentation
          </li>

          <li>
            Track your transactions
          </li>

          <li>
            Monitor your API usage
          </li>
        </ul>
      </div>

      <p>
        <a
          href="${dashboardUrl}"
          style="
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 8px;
          "
        >
          Open Dashboard
        </a>
      </p>

      <p>
        For your security, do not share your password
        or API key with anyone.
      </p>

      <p>
        Ayax Digital Solutions
      </p>
    </div>
  `;

  return deliverEmail({
    to: user.email,
    subject,
    text,
    html,
  });
};

/* ======================================================
   LOGIN ALERT EMAIL
====================================================== */

const sendLoginAlertEmail = async ({
  user,
  ipAddress,
  userAgent,
  loggedInAt = new Date(),
}) => {
  if (!user?.email) {
    const error = new Error(
      "A valid user email is required."
    );

    error.statusCode = 400;
    throw error;
  }

  const name =
    user.name ||
    "User";

  const subject =
    "New login to your Ayax APIs account";

  const securityUrl =
    `${FRONTEND_URL}/dashboard/settings`;

  const loginDate =
    formatDate(loggedInAt);

  const safeIpAddress =
    ipAddress ||
    "Unknown";

  const safeUserAgent =
    userAgent ||
    "Unknown";

  const text = `Hello ${name},

A successful login was recorded on your Ayax APIs account.

Time: ${loginDate}
IP Address: ${safeIpAddress}
Device/Browser: ${safeUserAgent}

If this was you, no action is required.

If this was not you, change your password immediately and review your account security.

${securityUrl}

Ayax APIs Security`;

  const html = `
    <div
      style="
        font-family: Arial, sans-serif;
        max-width: 620px;
        margin: auto;
        padding: 24px;
        color: #0f172a;
        line-height: 1.6;
      "
    >
      <h2>
        New Login Detected
      </h2>

      <p>
        Hello ${escapeHtml(name)},
      </p>

      <p>
        A successful login was recorded
        on your Ayax APIs account.
      </p>

      <div
        style="
          background: #f8fafc;
          border-radius: 12px;
          padding: 18px;
          margin: 20px 0;
        "
      >
        <p>
          <strong>Time:</strong>
          ${escapeHtml(loginDate)}
        </p>

        <p>
          <strong>IP Address:</strong>
          ${escapeHtml(safeIpAddress)}
        </p>

        <p>
          <strong>Device/Browser:</strong>
          ${escapeHtml(safeUserAgent)}
        </p>
      </div>

      <p>
        If this was you, no action is required.
      </p>

      <p>
        If this was not you, change your password
        immediately and review your account security.
      </p>

      <p>
        <a
          href="${securityUrl}"
          style="
            display: inline-block;
            background: #b91c1c;
            color: #ffffff;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 8px;
          "
        >
          Review Account Security
        </a>
      </p>

      <p>
        Ayax APIs Security
      </p>
    </div>
  `;

  return deliverEmail({
    to: user.email,
    subject,
    text,
    html,
  });
};

/* ======================================================
   WALLET FUNDING EMAIL
====================================================== */

const sendWalletFundingEmail = async ({
  user,
  amount,
  previousBalance,
  newBalance,
  reference,
  paymentReference,
  channel,
  fundedAt = new Date(),
}) => {
  if (!user?.email) {
    const error = new Error(
      "A valid user email is required."
    );

    error.statusCode = 400;
    throw error;
  }

  const name =
    user.name ||
    "User";

  const subject =
    "Wallet funding successful";

  const walletUrl =
    `${FRONTEND_URL}/dashboard/wallet`;

  const formattedAmount =
    formatMoney(amount);

  const formattedPreviousBalance =
    formatMoney(previousBalance);

  const formattedNewBalance =
    formatMoney(newBalance);

  const formattedDate =
    formatDate(fundedAt);

  const safeReference =
    reference ||
    "N/A";

  const safePaymentReference =
    paymentReference ||
    "N/A";

  const safeChannel =
    channel ||
    "N/A";

  const text = `Hello ${name},

Your Ayax APIs wallet has been funded successfully.

Amount: ${formattedAmount}
Previous Balance: ${formattedPreviousBalance}
New Balance: ${formattedNewBalance}
Reference: ${safeReference}
Payment Reference: ${safePaymentReference}
Channel: ${safeChannel}
Date: ${formattedDate}
Status: SUCCESSFUL

View your wallet:

${walletUrl}

Ayax Digital Solutions`;

  const html = `
    <div
      style="
        font-family: Arial, sans-serif;
        max-width: 620px;
        margin: auto;
        padding: 24px;
        color: #0f172a;
        line-height: 1.6;
      "
    >
      <h2>
        Wallet Funding Successful
      </h2>

      <p>
        Hello ${escapeHtml(name)},
      </p>

      <p>
        Your Ayax APIs wallet has been
        credited successfully.
      </p>

      <table
        style="
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        "
      >
        <tr>
          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            Amount
          </td>

          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            <strong>
              ${escapeHtml(formattedAmount)}
            </strong>
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            Previous Balance
          </td>

          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            ${escapeHtml(
              formattedPreviousBalance
            )}
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            New Balance
          </td>

          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            ${escapeHtml(
              formattedNewBalance
            )}
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            Reference
          </td>

          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            ${escapeHtml(
              safeReference
            )}
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            Payment Reference
          </td>

          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            ${escapeHtml(
              safePaymentReference
            )}
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            Channel
          </td>

          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            ${escapeHtml(
              safeChannel
            )}
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            Date
          </td>

          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            "
          >
            ${escapeHtml(
              formattedDate
            )}
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 10px;
            "
          >
            Status
          </td>

          <td
            style="
              padding: 10px;
            "
          >
            <strong>
              SUCCESSFUL
            </strong>
          </td>
        </tr>
      </table>

      <p>
        <a
          href="${walletUrl}"
          style="
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 8px;
          "
        >
          View Wallet
        </a>
      </p>

      <p>
        Ayax Digital Solutions
      </p>
    </div>
  `;

  return deliverEmail({
    to: user.email,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendWalletFundingEmail,
};