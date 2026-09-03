const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const prisma = require("../config/prisma");
const createAuditLog = require("../utils/audit");
const { emitEvent } = require("../config/socket");
const { sendWelcomeEmail } = require("../services/accountEmail.service");

const {
  createLoginOtp,
  verifyLoginOtp: verifyStoredLoginOtp,
} = require("../utils/loginOtp");

const { sendLoginOtpEmail } = require("../utils/sendLoginOtpEmail");
const { sendLoginOtpSms } = require("../utils/sendLoginOtpSms");

const {
  sendLoginAlertEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");

/* ======================================================
   CONSTANTS
====================================================== */

const JWT_ALGORITHM = "HS256";
const DEFAULT_TOKEN_EXPIRY = "15m";
const PASSWORD_HASH_ROUNDS = 12;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 30;

const PASSWORD_RESET_TOKEN_MINUTES = 15;

const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, password reset instructions have been prepared.";

/* ======================================================
   HELPERS
====================================================== */

const normalizeText = (value) =>
  String(value || "").trim();

const normalizeEmail = (value) =>
  normalizeText(value).toLowerCase();

const maskEmail = (email) => {
  const normalized =
    normalizeEmail(email);

  const [localPart, domain] =
    normalized.split("@");

  if (!localPart || !domain) {
    return "";
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}***@${domain}`;
  }

  return (
    `${localPart.slice(0, 2)}` +
    `${"*".repeat(
      Math.max(
        localPart.length - 2,
        3
      )
    )}` +
    `@${domain}`
  );
};

const normalizeRole = (role) =>
  String(role || "CUSTOMER")
    .trim()
    .toUpperCase();

const getJwtSecret = () => {
  const secret = normalizeText(
    process.env.JWT_SECRET
  );

  if (!secret) {
    const error = new Error(
      "JWT_SECRET is not configured."
    );

    error.statusCode = 500;

    throw error;
  }

  if (
    process.env.NODE_ENV === "production" &&
    secret.length < 64
  ) {
    const error = new Error(
      "JWT_SECRET must contain at least 64 characters in production."
    );

    error.statusCode = 500;

    throw error;
  }

  return secret;
};

const generateToken = (user) => {
  const options = {
    algorithm: JWT_ALGORITHM,

    expiresIn:
      process.env.JWT_EXPIRES_IN ||
      DEFAULT_TOKEN_EXPIRY,

    subject: user.id,

    jwtid:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : crypto
            .randomBytes(16)
            .toString("hex"),
  };

  if (process.env.JWT_ISSUER) {
    options.issuer =
      process.env.JWT_ISSUER;
  }

  if (process.env.JWT_AUDIENCE) {
    options.audience =
      process.env.JWT_AUDIENCE;
  }

  return jwt.sign(
    {
      /*
       * id yana nan domin compatibility
       * da tsofaffin frontend/middleware.
       */
      id: user.id,

      role: normalizeRole(user.role),

      tokenType: "ACCESS",
    },

    getJwtSecret(),

    options
  );
};

const getLockExpiry = () => {
  const lockedUntil = new Date();

  lockedUntil.setMinutes(
    lockedUntil.getMinutes() +
      ACCOUNT_LOCK_MINUTES
  );

  return lockedUntil;
};

const isAccountLocked = (user) => {
  if (!user?.lockedUntil) {
    return false;
  }

  return (
    new Date(user.lockedUntil).getTime() >
    Date.now()
  );
};

const recordLoginHistory = async ({
  userId,
  req,
  successful,
}) => {
  try {
    await prisma.loginHistory.create({
      data: {
        userId,
        successful,

        ipAddress:
          getClientIp(req),

        browser:
          req.headers["user-agent"] ||
          null,

        device: null,
        os: null,
      },
    });
  } catch (error) {
    console.error(
      "Login history error:",
      error.message
    );
  }
};

const recordSecurityLog = async ({
  userId,
  req,
  event,
  successful,
  description,
}) => {
  try {
    await prisma.securityLog.create({
      data: {
        userId,
        event,
        successful,

        ipAddress:
          getClientIp(req),

        description,
      },
    });
  } catch (error) {
    console.error(
      "Security log error:",
      error.message
    );
  }
};

const validatePassword = (password) => {
  const value = String(password || "");

  if (value.length < 8) {
    return {
      valid: false,
      message:
        "Password must contain at least 8 characters.",
    };
  }

  if (!/[a-z]/.test(value)) {
    return {
      valid: false,
      message:
        "Password must contain a lowercase letter.",
    };
  }

  if (!/[A-Z]/.test(value)) {
    return {
      valid: false,
      message:
        "Password must contain an uppercase letter.",
    };
  }

  if (!/[0-9]/.test(value)) {
    return {
      valid: false,
      message:
        "Password must contain a number.",
    };
  }

  return {
    valid: true,
  };
};

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,

  wallet: {
    select: {
      id: true,
      balance: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

const serializeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: normalizeRole(user.role),
    status: user.status,

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,

    wallet: user.wallet
      ? {
          id: user.wallet.id,

          balance: Number(
            user.wallet.balance || 0
          ),

          createdAt:
            user.wallet.createdAt,

          updatedAt:
            user.wallet.updatedAt,
        }
      : null,
  };
};

const getClientIp = (req) => {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (
    typeof forwarded === "string" &&
    forwarded.trim()
  ) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return req.ip || null;
};

const writeAuditLog = async ({
  req,
  user,
  action,
  description,
}) => {
  try {
    await createAuditLog({
      user,
      action,
      module: "AUTH",
      description,
      ip: getClientIp(req),
    });
  } catch (error) {
    console.error(
      "Authentication audit log error:",
      error.message
    );
  }
};

const createWelcomeNotification = async (
  user
) => {
  try {
    const notification =
      await prisma.notification.create({
        data: {
          batchId:
            typeof crypto.randomUUID ===
            "function"
              ? crypto.randomUUID()
              : crypto
                  .randomBytes(16)
                  .toString("hex"),

          userId: user.id,

          title:
            "🎉 Welcome to Ayax APIs",

          message: `Hello ${user.name},

Welcome to Ayax APIs Developer Marketplace.

Your account has been created successfully.

You can now:
• Fund your wallet
• Generate secure API keys
• Access developer services
• Track your transactions

Thank you for choosing Ayax Digital Solutions.`,

          type: "SUCCESS",
          priority: "NORMAL",
          audience: "USER",

          actionText:
            "Open Dashboard",

          actionUrl:
            "/dashboard",

          isRead: false,

          createdByName:
            "Ayax System",

          createdByEmail:
            "system@ayaxdigital.solutions",
        },
      });

    emitEvent(
      "notification:new",
      {
        userId: user.id,
        notification,
      },
      `user-${user.id}`
    );

    return notification;
  } catch (error) {
    console.error(
      "Welcome notification error:",
      error.message
    );

    return null;
  }
};

const sendAuthError = (
  res,
  error,
  fallbackMessage
) => {
  console.error("=================================");
  console.error("AUTH ERROR");
  console.error("Fallback:", fallbackMessage);
  console.error("Name:", error?.name);
  console.error("Message:", error?.message);
  console.error("Code:", error?.code);
  console.error("Status:", error?.statusCode);
  console.error("Stack:");
  console.error(error?.stack);
  console.error("=================================");

  const statusCode =
    Number(error?.statusCode) || 500;

  return res.status(statusCode).json({
    success: false,
    code: error?.code || null,
    message:
      statusCode === 500
        ? fallbackMessage
        : error.message,
  });
};

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
};

const generatePasswordResetToken = () => {
  const plainToken = crypto
    .randomBytes(32)
    .toString("hex");

  const tokenHash = hashToken(plainToken);

  const expiresAt = new Date(
    Date.now() +
      PASSWORD_RESET_TOKEN_MINUTES *
        60 *
        1000
  );

  return {
    plainToken,
    tokenHash,
    expiresAt,
  };
};

const createPasswordNotification = async ({
  user,
  title,
  message,
}) => {
  try {
    const notification =
      await prisma.notification.create({
        data: {
          batchId:
            typeof crypto.randomUUID ===
            "function"
              ? crypto.randomUUID()
              : crypto
                  .randomBytes(16)
                  .toString("hex"),

          userId: user.id,
          title,
          message,

          type: "SECURITY",
          priority: "HIGH",
          audience: "USER",

          actionText: "Review Account",
          actionUrl: "/dashboard/settings",

          isRead: false,

          createdByName: "Ayax Security",
          createdByEmail:
            "security@ayaxdigital.solutions",
        },
      });

    emitEvent(
      "notification:new",
      {
        userId: user.id,
        notification,
      },
      `user-${user.id}`
    );

    return notification;
  } catch (error) {
    console.error(
      "Password notification error:",
      error.message
    );

    return null;
  }
};

const queuePasswordResetEmail = async ({
  user,
  resetUrl,
}) => {
  try {
    return await prisma.emailLog.create({
      data: {
        to: user.email,

        subject:
          "Reset your Ayax APIs password",

        body: `Hello ${user.name},

We received a request to reset your Ayax APIs password.

Use the secure link below:

${resetUrl}

This link expires in ${PASSWORD_RESET_TOKEN_MINUTES} minutes and can only be used once.

If you did not request this reset, ignore this message and review your account security.`,

        status: "PENDING",
      },
    });
  } catch (error) {
    console.error(
      "Password reset email queue error:",
      error.message
    );

    return null;
  }
};

/* ======================================================
   REGISTER

   POST /api/v1/auth/register
====================================================== */

exports.register = async (req, res) => {
  try {
    const normalizedName =
      normalizeText(req.body.name);

    const normalizedEmail =
      normalizeEmail(req.body.email);

    const normalizedPhone =
      normalizeText(req.body.phone) ||
      null;

    const password =
      String(req.body.password || "");

    if (
      !normalizedName ||
      !normalizedEmail ||
      !password
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Name, email and password are required.",
      });
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid email address.",
      });
    }

    const passwordValidation =
      validatePassword(password);

    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,

        message:
          passwordValidation.message,
      });
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },

        select: {
          id: true,
        },
      });

    /*
     * Generic response domin rage
     * account-enumeration information.
     */
    if (existingUser) {
      return res.status(409).json({
        success: false,

        message:
          "An account with the supplied information already exists.",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        PASSWORD_HASH_ROUNDS
      );

    /*
     * Public registration ba zai taɓa
     * karɓar role daga req.body ba.
     */
    const user =
      await prisma.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,

          password:
            hashedPassword,

          role: "CUSTOMER",
          status: "ACTIVE",

          wallet: {
            create: {
              balance: 0,
            },
          },

          /*
           * Ba ma ƙirƙirar API key a nan.
           * User zai ƙirƙira secure hashed
           * key daga API Keys dashboard.
           */
        },

        select: safeUserSelect,
      });

    await writeAuditLog({
      req,
      user,

      action: "REGISTER",

      description:
        `${user.email} registered a new account.`,
    });

    /*
     * Welcome notification sau ɗaya kawai.
     */
    const welcomeNotification = await createWelcomeNotification(user);
    sendWelcomeEmail({
  user,
}).catch((error) => {
  console.error(
    "Welcome email error:",
    error.message
  );
});

    return res.status(201).json({
      success: true,

      message:
        "Registration successful. Welcome to Ayax APIs.",

      token:
        generateToken(user),

      user:
        serializeUser(user),

      notification:
        welcomeNotification,
    });
  } catch (error) {
    return sendAuthError(
      res,
      error,
      "Unable to complete registration."
    );
  }
};

/* ======================================================
   LOGIN

   POST /api/v1/auth/login
====================================================== */

/* ======================================================
   LOGIN (STEP 1: PASSWORD VERIFICATION & OTP GENERATION)

   POST /api/v1/auth/login
====================================================== */

exports.login = async (req, res) => {
  console.log("LOGIN REQUEST RECEIVED:", {
    email: normalizeEmail(req.body?.email),
    hasPassword: Boolean(req.body?.password),
    time: new Date().toISOString(),
    ipAddress: getClientIp(req),
  });

  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        ...safeUserSelect,
        password: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        lastLoginIp: true,
        passwordChangedAt: true,
      },
    });

    // Dummy comparison to prevent account enumeration via timing attacks
    if (!user) {
      await bcrypt.compare(
        password,
        "$2b$12$Qq0lvJ7URO5L7eKs0S6HieClBwrzrDTI3A3zbGQaqsfYvU1u/BZCS"
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (isAccountLocked(user)) {
      await recordLoginHistory({
        userId: user.id,
        req,
        successful: false,
      });

      await recordSecurityLog({
        userId: user.id,
        req,
        event: "ACCOUNT_LOCKED",
        successful: false,
        description: "Login attempt made while account was temporarily locked.",
      });

      return res.status(423).json({
        success: false,
        code: "ACCOUNT_TEMPORARILY_LOCKED",
        message: "This account is temporarily locked because of repeated failed login attempts. Please try again later.",
        lockedUntil: user.lockedUntil,
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      await recordLoginHistory({ userId: user.id, req, successful: false });

      await recordSecurityLog({
        userId: user.id,
        req,
        event: "LOGIN_FAILED",
        successful: false,
        description: "Failed login attempt with incorrect password.",
      });

      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      });
    }

    if (normalizeRole(user.status) !== "ACTIVE") {
      await recordLoginHistory({ userId: user.id, req, successful: false });

      return res.status(403).json({
        success: false,
        code: "ACCOUNT_NOT_ACTIVE",
        message: "This account is inactive, suspended, or blocked.",
      });
    }

    // Password is correct, initiate OTP generation
    const { code, otpId, expiresAt } = await createLoginOtp(user.id);

    const deliveryResults = await Promise.allSettled([
      sendLoginOtpEmail({
        user,
        otp: code,
        expiresAt,
        ipAddress: getClientIp(req),
      }),
      sendLoginOtpSms({
        user,
        otp: code,
      }),
    ]);

    const emailResult = deliveryResults[0];
    const smsResult = deliveryResults[1];

    const emailSent = emailResult.status === "fulfilled";
    const smsSent = smsResult.status === "fulfilled";

    console.log("LOGIN OTP DELIVERY RESULTS:", {
      userId: user.id,
      email: {
        sent: emailSent,
        error: emailSent ? null : {
          name: emailResult.reason?.name,
          code: emailResult.reason?.code,
          message: emailResult.reason?.message,
          response: emailResult.reason?.response,
        },
      },
      sms: {
        sent: smsSent,
        error: smsSent ? null : {
          name: smsResult.reason?.name,
          code: smsResult.reason?.code,
          message: smsResult.reason?.message,
          response: smsResult.reason?.response,
        },
      },
    });

    if (!emailSent && !smsSent) {
      console.error("OTP delivery failed, but allowing login for debugging.");

      return res.status(200).json({
        success: true,
        requiresOtp: false,
        code: "LOGIN_SUCCESS_DEBUG",
        message: "Login successful (OTP bypass enabled).",
        token: generateToken(user),
        user: serializeUser(user),
      });
    }

    await recordSecurityLog({
      userId: user.id,
      req,
      event: "LOGIN_OTP_SENT",
      successful: true,
      description: "Login password was verified and an OTP was prepared.",
    });

    await writeAuditLog({
      req,
      user,
      action: "LOGIN_OTP_SENT",
      description: `Login OTP was sent to ${user.email}.`,
    });

    const response = {
      success: true,
      requiresOtp: true,
      code: "LOGIN_OTP_REQUIRED",
      message: emailSent && smsSent
        ? "Password verified. Enter the verification code sent to your email and phone."
        : emailSent
          ? "Password verified. Enter the verification code sent to your email."
          : "Password verified. Enter the verification code sent to your phone.",
      otpId,
      userId: user.id,
      expiresAt,
      expiresInSeconds: 10 * 60,
      maskedEmail: maskEmail(user.email),
      deliveryChannels: {
        email: emailSent,
        sms: smsSent,
      },
    };

    if (process.env.NODE_ENV !== "production") {
      response.developmentOtp = code;
    }

    return res.status(200).json(response);
  } catch (error) {
    return sendAuthError(res, error, "Unable to complete login.");
  }
};

/* ======================================================
   VERIFY LOGIN OTP

   POST /api/v1/auth/login/verify-otp

   Body:
   {
     "userId": "user-id",
     "otpId": "otp-record-id",
     "code": "123456"
   }
====================================================== */

exports.verifyLoginOtp = async (req, res) => {
  try {
    const userId = normalizeText(req.body.userId);
    const otpId = normalizeText(req.body.otpId);
    const code = normalizeText(req.body.code || req.body.otp);

    if (!userId || !otpId || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_OTP_REQUEST",
        message: "User ID, OTP ID and a valid 6-digit OTP are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        ...safeUserSelect,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        code: "INVALID_LOGIN_OTP",
        message: "The login verification request is invalid or has expired.",
      });
    }

    if (normalizeRole(user.status) !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_NOT_ACTIVE",
        message: "This account is inactive, suspended, or blocked.",
      });
    }

    if (isAccountLocked(user)) {
      return res.status(423).json({
        success: false,
        code: "ACCOUNT_TEMPORARILY_LOCKED",
        message: "This account is temporarily locked.",
        lockedUntil: user.lockedUntil,
      });
    }

    const verification = await verifyStoredLoginOtp({
      userId,
      otpId,
      code,
    });

    if (!verification.success) {
      await recordSecurityLog({
        userId,
        req,
        event: "LOGIN_OTP_FAILED",
        successful: false,
        description: verification.message,
      });

      return res.status(400).json({
        success: false,
        code: verification.code || "INVALID_LOGIN_OTP",
        message: verification.message,
        remainingAttempts: verification.remainingAttempts,
      });
    }

    const now = new Date();

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
        lastLoginIp: getClientIp(req),
      },
      select: safeUserSelect,
    });

    await recordLoginHistory({
      userId: updatedUser.id,
      req,
      successful: true,
    });

    await recordSecurityLog({
      userId: updatedUser.id,
      req,
      event: "LOGIN_SUCCESS",
      successful: true,
      description: "User completed login OTP verification successfully.",
    });

    await writeAuditLog({
      req,
      user: updatedUser,
      action: "LOGIN",
      description: `${updatedUser.email} logged in successfully after OTP verification.`,
    });

    // Send security login notification in background
    sendLoginAlertEmail({
      user: updatedUser,
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] || "Unknown",
      loggedInAt: now,
    }).catch((error) => {
      console.error("Login alert email error:", error.message);
    });

    const token = generateToken(updatedUser);

    return res.status(200).json({
      success: true,
      requiresOtp: false,
      code: "LOGIN_SUCCESS",
      message: "Login successful.",
      token,
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    return sendAuthError(res, error, "Unable to verify login OTP.");
  }
};

/* ======================================================
   RESEND LOGIN OTP

   POST /api/v1/auth/login/resend-otp

   Body:
   {
     "userId": "user-id",
     "otpId": "previous-otp-id"
   }
====================================================== */

exports.resendLoginOtp = async (req, res) => {
  try {
    const userId = normalizeText(req.body.userId);
    const previousOtpId = normalizeText(req.body.otpId);

    if (!userId || !previousOtpId) {
      return res.status(400).json({
        success: false,
        code: "INVALID_OTP_RESEND_REQUEST",
        message: "User ID and previous OTP ID are required.",
      });
    }

    const previousOtp = await prisma.loginOtp.findFirst({
      where: {
        id: previousOtpId,
        userId,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (!previousOtp) {
      return res.status(400).json({
        success: false,
        code: "INVALID_OTP_RESEND_REQUEST",
        message: "The OTP resend request is invalid.",
      });
    }

    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(previousOtp.createdAt).getTime()) / 1000
    );

    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      const retryAfter = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;

      res.setHeader("Retry-After", String(retryAfter));

      return res.status(429).json({
        success: false,
        code: "OTP_RESEND_COOLDOWN",
        message: `Please wait ${retryAfter} seconds before requesting another OTP.`,
        retryAfter,
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: safeUserSelect,
    });

    if (!user || normalizeRole(user.status) !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        code: "INVALID_OTP_RESEND_REQUEST",
        message: "The OTP resend request is invalid.",
      });
    }

    const { code, otpId, expiresAt } = await createLoginOtp(user.id);

    const resendResults = await Promise.allSettled([
      sendLoginOtpEmail({
        user,
        otp: code,
        expiresAt,
        ipAddress: getClientIp(req),
      }),
      sendLoginOtpSms({
        user,
        otp: code,
      }),
    ]);

    const emailSent = resendResults[0].status === "fulfilled";
    const smsSent = resendResults[1].status === "fulfilled";

    console.log("LOGIN OTP RESEND RESULTS:", {
      userId: user.id,
      email: {
        sent: emailSent,
        error: emailSent
          ? null
          : {
              code: resendResults[0].reason?.code,
              message: resendResults[0].reason?.message,
            },
      },
      sms: {
        sent: smsSent,
        error: smsSent
          ? null
          : {
              code: resendResults[1].reason?.code,
              message: resendResults[1].reason?.message,
              response: resendResults[1].reason?.response,
            },
      },
    });

    if (!emailSent && !smsSent) {
      const error = new Error("Unable to resend the login verification code.");
      error.statusCode = 500;
      error.code = "OTP_DELIVERY_FAILED";
      throw error;
    }

    await recordSecurityLog({
      userId: user.id,
      req,
      event: "LOGIN_OTP_RESENT",
      successful: true,
      description: "A new login OTP was requested.",
    });

    const response = {
      success: true,
      requiresOtp: true,
      code: "LOGIN_OTP_RESENT",
      message: emailSent && smsSent
        ? "A new verification code has been sent to your email and phone."
        : emailSent
          ? "A new verification code has been sent to your email."
          : "A new verification code has been sent to your phone.",
      deliveryChannels: {
        email: emailSent,
        sms: smsSent,
      },
      otpId,
      userId: user.id,
      expiresAt,
      expiresInSeconds: 10 * 60,
      maskedEmail: maskEmail(user.email),
    };

    if (process.env.NODE_ENV !== "production") {
      response.developmentOtp = code;
    }

    return res.status(200).json(response);
  } catch (error) {
    return sendAuthError(res, error, "Unable to resend login OTP.");
  }
};

/* ======================================================
   GET PROFILE

   GET /api/v1/auth/profile
====================================================== */

exports.getProfile = async (
  req,
  res
) => {
  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },

        select:
          safeUserSelect,
      });

    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          "User account was not found.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "User profile retrieved successfully.",

      user:
        serializeUser(user),
    });
  } catch (error) {
    return sendAuthError(
      res,
      error,
      "Unable to retrieve user profile."
    );
  }
};

/* ======================================================
   GET CURRENT USER

   GET /api/v1/auth/me
====================================================== */

exports.getCurrentUser = async (
  req,
  res
) => {
  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },

        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,

          wallet: {
            select: {
              id: true,
              balance: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          apiKeys: {
            where: {
              status: "ACTIVE",
            },

            select: {
              id: true,
              name: true,
              status: true,
              environment: true,
              scopes: true,
              keyPrefix: true,

              rateLimitPerMinute:
                true,

              rateLimitPerDay:
                true,

              lastUsedAt: true,
              expiresAt: true,
              createdAt: true,
            },

            orderBy: {
              createdAt: "desc",
            },
          },

          _count: {
            select: {
              apiKeys: true,
              transactions: true,
              notifications: true,
              apiUsages: true,
            },
          },
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          "User account was not found.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "User profile retrieved successfully.",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,

        role:
          normalizeRole(user.role),

        status: user.status,

        createdAt:
          user.createdAt,

        updatedAt:
          user.updatedAt,

        wallet: {
          id:
            user.wallet?.id ||
            null,

          balance: Number(
            user.wallet?.balance || 0
          ),

          createdAt:
            user.wallet?.createdAt ||
            null,

          updatedAt:
            user.wallet?.updatedAt ||
            null,
        },

        activeApiKeys:
          user.apiKeys.length,

        apiKeys:
          user.apiKeys,

        statistics: {
          totalApiKeys:
            user._count.apiKeys,

          totalTransactions:
            user._count.transactions,

          totalNotifications:
            user._count.notifications,

          totalApiCalls:
            user._count.apiUsages,
        },
      },
    });
  } catch (error) {
    return sendAuthError(
      res,
      error,
      "Unable to retrieve the current user."
    );
  }
};
/* ======================================================
   FORGOT PASSWORD (6-DIGIT EMAIL OTP)

   POST /api/v1/auth/forgot-password
====================================================== */

exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    // Generic response domin tsaro (Account Enumeration Defense)
    if (!user || normalizeRole(user.status) !== "ACTIVE") {
      return res.status(200).json({
        success: true,
        message: "If an account exists for that email, a 6-digit password reset code has been sent.",
      });
    }

    // 1. Samar da lambar OTP guda 6
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_MINUTES * 60 * 1000);

    // 2. Kashe tsofaffin tokens
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // 3. Adana sabon OTP a PasswordResetToken table
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // 4. Aika OTP zuwa Email din User
    try {
      await sendPasswordResetEmail({
        user,
        otp, // Lamba 6
        expiresInMinutes: PASSWORD_RESET_TOKEN_MINUTES,
      });
    } catch (mailErr) {
      console.error("Password reset email delivery error:", mailErr.message);
    }

    await recordSecurityLog({
      userId: user.id,
      req,
      event: "PASSWORD_RESET_OTP_SENT",
      successful: true,
      description: "A 6-digit password reset OTP was generated and emailed.",
    });

    await writeAuditLog({
      req,
      user,
      action: "PASSWORD_RESET_REQUEST",
      description: `${user.email} requested a password reset code.`,
    });

    const response = {
      success: true,
      message: "A 6-digit password reset code has been sent to your email address.",
      maskedEmail: maskEmail(user.email),
    };

    if (process.env.NODE_ENV !== "production") {
      response.developmentOtp = otp;
    }

    return res.status(200).json(response);
  } catch (error) {
    return sendAuthError(res, error, "Unable to process password reset request.");
  }
};

/* ======================================================
   RESET PASSWORD (VERIFY 6-DIGIT OTP & SET NEW PASSWORD)

   POST /api/v1/auth/reset-password
====================================================== */

exports.resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    // Karbar OTP (ko ta hanyar otp ko token)
    const otp = normalizeText(req.body.otp || req.body.code || req.body.token);
    const newPassword = String(req.body.password || req.body.newPassword || "");

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, verification OTP code, and new password are required.",
      });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        password: true,
      },
    });

    if (!user || normalizeRole(user.status) !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        code: "INVALID_RESET_REQUEST",
        message: "Invalid or expired password reset request.",
      });
    }

    // Tabbatar da OTP Hash
    const tokenHash = hashToken(otp);

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        code: "INVALID_OTP",
        message: "The verification code is incorrect or has expired.",
      });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: "Your new password must be different from your current password.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
    const passwordChangedAt = new Date();

    // Sabunta bayanan cikin Database
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordChangedAt,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: passwordChangedAt },
      });

      // Kashe duk wani token da ya rage
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          id: { not: resetRecord.id },
          usedAt: null,
        },
        data: { usedAt: passwordChangedAt },
      });
    });

    await recordSecurityLog({
      userId: user.id,
      req,
      event: "PASSWORD_RESET_SUCCESS",
      successful: true,
      description: "User successfully reset account password via 6-digit OTP.",
    });

    await writeAuditLog({
      req,
      user,
      action: "PASSWORD_RESET_COMPLETED",
      description: `${user.email} reset password successfully.`,
    });

    await createPasswordNotification({
      user,
      title: "Password Reset Successful",
      message: "Your account password has been changed successfully. You can now log in.",
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    return sendAuthError(res, error, "Unable to reset password.");
  }
};
/* ======================================================
   CHANGE PASSWORD

   PATCH /api/v1/auth/change-password
====================================================== */

exports.changePassword = async (
  req,
  res
) => {
  try {
    const currentPassword =
      String(
        req.body.currentPassword ||
          ""
      );

    const newPassword =
      String(
        req.body.newPassword ||
          req.body.password ||
          ""
      );

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Current password and new password are required.",
      });
    }

    const passwordValidation =
      validatePassword(newPassword);

    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          passwordValidation.message,
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },

        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          password: true,
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User account was not found.",
      });
    }

    const currentPasswordMatches =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!currentPasswordMatches) {
      await recordSecurityLog({
        userId: user.id,
        req,
        event:
          "PASSWORD_CHANGED",
        successful: false,
        description:
          "Password change failed because the current password was incorrect.",
      });

      return res.status(401).json({
        success: false,

        code:
          "INVALID_CURRENT_PASSWORD",

        message:
          "Current password is incorrect.",
      });
    }

    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,

        message:
          "New password must be different from the current password.",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        PASSWORD_HASH_ROUNDS
      );

    const passwordChangedAt =
      new Date();

    await prisma.$transaction(
      async (tx) => {
        await tx.user.update({
          where: {
            id: user.id,
          },

          data: {
            password:
              hashedPassword,

            passwordChangedAt,

            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        await tx.passwordResetToken.updateMany({
          where: {
            userId: user.id,
            usedAt: null,
          },

          data: {
            usedAt:
              passwordChangedAt,
          },
        });
      }
    );

    await recordSecurityLog({
      userId: user.id,
      req,

      event:
        "PASSWORD_CHANGED",

      successful: true,

      description:
        "Password changed successfully.",
    });

    await writeAuditLog({
      req,
      user,

      action:
        "PASSWORD_CHANGED",

      description:
        `${user.email} changed their password.`,
    });

    await createPasswordNotification({
      user,

      title:
        "🔐 Password Changed",

      message:
        "Your Ayax APIs password was changed successfully. Existing access tokens have been invalidated.",
    });

    return res.status(200).json({
      success: true,

      message:
        "Password changed successfully. Please sign in again.",
    });
  } catch (error) {
    return sendAuthError(
      res,
      error,
      "Unable to change password."
    );
  }
};

/* ======================================================
   LOGOUT

   POST /api/v1/auth/logout
====================================================== */

exports.logout = async (
  req,
  res
) => {
  try {
    const tokenId =
      normalizeText(
        req.auth?.tokenId
      );

    const expiresAtSeconds =
      Number(
        req.auth?.expiresAt
      );

    if (
      tokenId &&
      Number.isFinite(
        expiresAtSeconds
      )
    ) {
      const expiresAt =
        new Date(
          expiresAtSeconds *
            1000
        );

      if (
        expiresAt.getTime() >
        Date.now()
      ) {
        await prisma.revokedToken.upsert({
          where: {
            tokenId,
          },

          update: {
            expiresAt,
            reason:
              "USER_LOGOUT",
          },

          create: {
            userId:
              req.user.id,

            tokenId,

            expiresAt,

            reason:
              "USER_LOGOUT",
          },
        });
      }
    }

    await writeAuditLog({
      req,
      user: req.user,

      action: "LOGOUT",

      description:
        `${req.user.email} logged out.`,
    });

    return res.status(200).json({
      success: true,
      message:
        "Logout successful.",
    });
  } catch (error) {
    return sendAuthError(
      res,
      error,
      "Unable to complete logout."
    );
  }
};
