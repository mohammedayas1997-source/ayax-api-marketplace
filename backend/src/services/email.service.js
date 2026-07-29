const { Resend } = require("resend");

let resendClient = null;

/* ======================================================
   HELPERS
====================================================== */

const normalizeText = (value) =>
  String(value || "").trim();

const getResendClient = () => {
  const apiKey = normalizeText(
    process.env.RESEND_API_KEY
  );

  if (!apiKey) {
    const error = new Error(
      "RESEND_API_KEY is not configured."
    );

    error.statusCode = 500;
    throw error;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
};

const getMailFrom = () => {
  const mailFrom = normalizeText(
    process.env.MAIL_FROM
  );

  if (!mailFrom) {
    const error = new Error(
      "MAIL_FROM is not configured."
    );

    error.statusCode = 500;
    throw error;
  }

  return mailFrom;
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/* ======================================================
   GENERIC EMAIL SENDER
====================================================== */

const sendEmail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
  tags,
}) => {
  const normalizedTo = normalizeText(to);
  const normalizedSubject =
    normalizeText(subject);

  if (!normalizedTo) {
    const error = new Error(
      "Email recipient is required."
    );

    error.statusCode = 400;
    throw error;
  }

  if (!normalizedSubject) {
    const error = new Error(
      "Email subject is required."
    );

    error.statusCode = 400;
    throw error;
  }

  if (!html && !text) {
    const error = new Error(
      "Email HTML or text content is required."
    );

    error.statusCode = 400;
    throw error;
  }

  const resend = getResendClient();

  const payload = {
    from: getMailFrom(),
    to: [normalizedTo],
    subject: normalizedSubject,
  };

  if (html) {
    payload.html = html;
  }

  if (text) {
    payload.text = text;
  }

  if (replyTo) {
    payload.replyTo = replyTo;
  }

  if (Array.isArray(tags) && tags.length) {
    payload.tags = tags;
  }

  const { data, error } =
    await resend.emails.send(payload);

  if (error) {
    const sendError = new Error(
      error.message ||
        "Unable to send email."
    );

    sendError.statusCode =
      error.statusCode || 500;

    sendError.details = error;

    throw sendError;
  }

  return {
    success: true,
    id: data?.id || null,
    data,
  };
};

/* ======================================================
   PASSWORD RESET EMAIL
====================================================== */

const sendPasswordResetEmail = async ({
  user,
  resetUrl,
  expiresInMinutes = 15,
}) => {
  if (!user?.email) {
    const error = new Error(
      "User email address is required."
    );

    error.statusCode = 400;
    throw error;
  }

  if (!resetUrl) {
    const error = new Error(
      "Password reset URL is required."
    );

    error.statusCode = 400;
    throw error;
  }

  const safeName =
    escapeHtml(user.name || "Developer");

  const safeResetUrl =
    escapeHtml(resetUrl);

  const subject =
    "Reset your Ayax APIs password";

  const text = `Hello ${user.name || "Developer"},

We received a request to reset your Ayax APIs password.

Use the secure link below:

${resetUrl}

This link expires in ${expiresInMinutes} minutes and can only be used once.

If you did not request this reset, you can safely ignore this email.

Ayax APIs
Ayax Digital Solutions`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>Password Reset</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #020617;
          font-family: Arial, Helvetica, sans-serif;
          color: #e2e8f0;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="background-color: #020617; padding: 30px 15px;"
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  max-width: 600px;
                  background-color: #0f172a;
                  border: 1px solid #1e293b;
                  border-radius: 20px;
                  overflow: hidden;
                "
              >
                <tr>
                  <td
                    style="
                      padding: 32px;
                      text-align: center;
                      background-color: #111827;
                    "
                  >
                    <div
                      style="
                        display: inline-block;
                        padding: 14px 18px;
                        border-radius: 14px;
                        background-color: #2563eb;
                        color: #ffffff;
                        font-size: 22px;
                        font-weight: 700;
                      "
                    >
                      AYAX APIs
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 36px 32px;">
                    <h1
                      style="
                        margin: 0 0 20px;
                        font-size: 28px;
                        line-height: 1.3;
                        color: #ffffff;
                      "
                    >
                      Reset your password
                    </h1>

                    <p
                      style="
                        margin: 0 0 16px;
                        font-size: 16px;
                        line-height: 1.7;
                        color: #cbd5e1;
                      "
                    >
                      Hello ${safeName},
                    </p>

                    <p
                      style="
                        margin: 0 0 24px;
                        font-size: 16px;
                        line-height: 1.7;
                        color: #cbd5e1;
                      "
                    >
                      We received a request to reset your
                      Ayax APIs password. Click the button
                      below to create a new password.
                    </p>

                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td align="center" style="padding: 8px 0 28px;">
                          <a
                            href="${safeResetUrl}"
                            style="
                              display: inline-block;
                              padding: 15px 28px;
                              border-radius: 12px;
                              background-color: #2563eb;
                              color: #ffffff;
                              font-size: 16px;
                              font-weight: 700;
                              text-decoration: none;
                            "
                          >
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p
                      style="
                        margin: 0 0 16px;
                        font-size: 14px;
                        line-height: 1.7;
                        color: #94a3b8;
                      "
                    >
                      This link expires in
                      ${expiresInMinutes} minutes and can
                      only be used once.
                    </p>

                    <p
                      style="
                        margin: 0 0 10px;
                        font-size: 14px;
                        line-height: 1.7;
                        color: #94a3b8;
                      "
                    >
                      If the button does not work, copy and
                      paste this link into your browser:
                    </p>

                    <p
                      style="
                        margin: 0;
                        padding: 14px;
                        border-radius: 10px;
                        background-color: #020617;
                        color: #60a5fa;
                        font-size: 13px;
                        line-height: 1.6;
                        word-break: break-all;
                      "
                    >
                      ${safeResetUrl}
                    </p>

                    <p
                      style="
                        margin: 24px 0 0;
                        font-size: 14px;
                        line-height: 1.7;
                        color: #94a3b8;
                      "
                    >
                      If you did not request this password
                      reset, you can safely ignore this
                      email.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 24px 32px;
                      text-align: center;
                      border-top: 1px solid #1e293b;
                      background-color: #0b1120;
                    "
                  >
                    <p
                      style="
                        margin: 0;
                        font-size: 13px;
                        line-height: 1.6;
                        color: #64748b;
                      "
                    >
                      Ayax APIs Developer Marketplace
                      <br />
                      Ayax Digital Solutions
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
    text,
    tags: [
      {
        name: "category",
        value: "password-reset",
      },
    ],
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
};