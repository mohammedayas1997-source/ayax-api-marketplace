const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const prisma = require("../config/prisma");
const createAuditLog = require("../utils/audit");
const { emitEvent } = require("../config/socket");

const {
  createLoginOtp,
  verifyLoginOtp: verifyStoredLoginOtp,
} = require("../utils/loginOtp");

const {
  sendLoginOtpEmail,
} = require("../utils/sendLoginOtpEmail");

const {
  sendLoginOtpSms,
} = require("../utils/sendLoginOtpSms");

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
  console.error(
    fallbackMessage,
    error
  );

  const statusCode =
    Number(error?.statusCode) || 500;

  return res.status(statusCode).json({
    success: false,

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
    const welcomeNotification =
      await createWelcomeNotification(
        user
      );

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

exports.login = async (req, res) => {
  try {
    const normalizedEmail =
      normalizeEmail(req.body.email);

    const password =
      String(req.body.password || "");

    if (
      !normalizedEmail ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },

        select: {
          ...safeUserSelect,

          password: true,

          failedLoginAttempts:
            true,

          lockedUntil: true,

          lastLoginAt: true,

          lastLoginIp: true,

          passwordChangedAt:
            true,
        },
      });

    /*
     * Dummy comparison domin rage
     * account enumeration ta timing.
     */
    if (!user) {
      await bcrypt.compare(
        password,
        "$2b$12$Qq0lvJ7URO5L7eKs0S6HieClBwrzrDTI3A3zbGQaqsfYvU1u/BZCS"
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
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
        description:
          "Login attempt made while account was temporarily locked.",
      });

      return res.status(423).json({
        success: false,

        code:
          "ACCOUNT_TEMPORARILY_LOCKED",

        message:
          "This account is temporarily locked because of repeated failed login attempts. Please try again later.",

        lockedUntil:
          user.lockedUntil,
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatches) {
      const failedAttempts =
        Number(
          user.failedLoginAttempts || 0
        ) + 1;

      const shouldLock =
        failedAttempts >=
        MAX_FAILED_LOGIN_ATTEMPTS;

      const lockedUntil =
        shouldLock
          ? getLockExpiry()
          : null;

      await prisma.user.update({
        where: {
          id: user.id,
        },

        data: {
          failedLoginAttempts:
            shouldLock
              ? 0
              : failedAttempts,

          lockedUntil,
        },
      });

      await recordLoginHistory({
        userId: user.id,
        req,
        successful: false,
      });

      await recordSecurityLog({
        userId: user.id,
        req,

        event: shouldLock
          ? "ACCOUNT_LOCKED"
          : "LOGIN_FAILED",

        successful: false,

        description: shouldLock
          ? `Account temporarily locked after ${MAX_FAILED_LOGIN_ATTEMPTS} failed login attempts.`
          : `Failed login attempt ${failedAttempts} of ${MAX_FAILED_LOGIN_ATTEMPTS}.`,
      });

      return res.status(401).json({
        success: false,

        code: shouldLock
          ? "ACCOUNT_TEMPORARILY_LOCKED"
          : "INVALID_CREDENTIALS",

        message: shouldLock
          ? "Too many failed login attempts. This account has been temporarily locked."
          : "Invalid email or password.",

        remainingAttempts:
          shouldLock
            ? 0
            : Math.max(
                MAX_FAILED_LOGIN_ATTEMPTS -
                  failedAttempts,
                0
              ),

        lockedUntil,
      });
    }

    if (
      normalizeRole(user.status) !==
      "ACTIVE"
    ) {
      await recordLoginHistory({
        userId: user.id,
        req,
        successful: false,
      });

      return res.status(403).json({
        success: false,

        code:
          "ACCOUNT_NOT_ACTIVE",

        message:
          "This account is inactive, suspended, or blocked.",
      });
    }

        /*
     * Password ya yi daidai, amma har yanzu
     * ba a kammala login ba sai an tabbatar
     * da OTP.
     */
    const {
      code,
      otpId,
      expiresAt,
    } = await createLoginOtp(
      user.id
    );

const deliveryResults =
  await Promise.allSettled([
    sendLoginOtpEmail({
      user,
      otp: code,
      expiresAt,
      ipAddress:
        getClientIp(req),
    }),

    sendLoginOtpSms({
      user,
      otp: code,
    }),
  ]);

const emailSent =
  deliveryResults[0].status ===
  "fulfilled";

const smsSent =
  deliveryResults[1].status ===
  "fulfilled";

if (!emailSent) {
  console.error(
    "Login OTP email failed:",
    deliveryResults[0].reason
  );
}

if (!smsSent) {
  console.error(
    "Login OTP SMS failed:",
    deliveryResults[1].reason
  );
}

if (!emailSent && !smsSent) {
  const error = new Error(
    "Unable to deliver the login verification code."
  );

  error.statusCode = 500;
  throw error;
}

    await recordSecurityLog({
      userId: user.id,
      req,

      event:
        "LOGIN_OTP_SENT",

      successful: true,

      description:
        "Login password was verified and an OTP was prepared.",
    });

    await writeAuditLog({
      req,
      user,

      action:
        "LOGIN_OTP_SENT",

      description:
        `Login OTP was sent to ${user.email}.`,
    });

    const response = {
      success: true,

      requiresOtp: true,

      code:
        "LOGIN_OTP_REQUIRED",

      message:
        "Password verified. Enter the verification code sent to your email.",

      otpId,

      userId: user.id,

      expiresAt,

      expiresInSeconds:
        10 * 60,

      maskedEmail:
        maskEmail(user.email),
    };

    /*
     * Development kawai:
     * wannan yana taimakawa testing idan
     * email worker bai fara aiki ba.
     *
     * Kada OTP ya fito a production.
     */
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      response.developmentOtp =
        code;
    }

    return res.status(200).json(
      response
    );
  } catch (error) {
    return sendAuthError(
      res,
      error,
      "Unable to complete login."
    );
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

exports.verifyLoginOtp = async (
  req,
  res
) => {
  try {
    const userId =
      normalizeText(
        req.body.userId
      );

    const otpId =
      normalizeText(
        req.body.otpId
      );

    const code =
      normalizeText(
        req.body.code ||
        req.body.otp
      );

    if (
      !userId ||
      !otpId ||
      !/^\d{6}$/.test(code)
    ) {
      return res.status(400).json({
        success: false,

        code:
          "INVALID_OTP_REQUEST",

        message:
          "User ID, OTP ID and a valid 6-digit OTP are required.",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          ...safeUserSelect,

          failedLoginAttempts:
            true,

          lockedUntil: true,
        },
      });

    if (!user) {
      return res.status(400).json({
        success: false,

        code:
          "INVALID_LOGIN_OTP",

        message:
          "The login verification request is invalid or has expired.",
      });
    }

    if (
      normalizeRole(user.status) !==
      "ACTIVE"
    ) {
      return res.status(403).json({
        success: false,

        code:
          "ACCOUNT_NOT_ACTIVE",

        message:
          "This account is inactive, suspended, or blocked.",
      });
    }

    if (isAccountLocked(user)) {
      return res.status(423).json({
        success: false,

        code:
          "ACCOUNT_TEMPORARILY_LOCKED",

        message:
          "This account is temporarily locked.",

        lockedUntil:
          user.lockedUntil,
      });
    }

    const verification =
      await verifyStoredLoginOtp({
        userId,
        otpId,
        code,
      });

    if (!verification.success) {
      await recordSecurityLog({
        userId,
        req,

        event:
          "LOGIN_OTP_FAILED",

        successful: false,

        description:
          verification.message,
      });

      return res.status(400).json({
        success: false,

        code:
          verification.code ||
          "INVALID_LOGIN_OTP",

        message:
          verification.message,

        remainingAttempts:
          verification.remainingAttempts,
      });
    }

    const now = new Date();

    const updatedUser =
      await prisma.user.update({
        where: {
          id: user.id,
        },

        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,

          lastLoginAt: now,

          lastLoginIp:
            getClientIp(req),
        },

        select:
          safeUserSelect,
      });

    /*
     * Login history zai zama successful
     * ne bayan OTP ya yi daidai.
     */
    await recordLoginHistory({
      userId: updatedUser.id,
      req,
      successful: true,
    });

    await recordSecurityLog({
      userId: updatedUser.id,
      req,

      event:
        "LOGIN_SUCCESS",

      successful: true,

      description:
        "User completed login OTP verification successfully.",
    });

    await writeAuditLog({
      req,
      user: updatedUser,

      action: "LOGIN",

      description:
        `${updatedUser.email} logged in successfully after OTP verification.`,
    });

    const token =
      generateToken(
        updatedUser
      );

    return res.status(200).json({
      success: true,

      requiresOtp: false,

      code:
        "LOGIN_SUCCESS",

      message:
        "Login successful.",

      token,

      user:
        serializeUser(
          updatedUser
        ),
    });
  } catch (error) {
    return sendAuthError(
      res,
      error,
      "Unable to verify login OTP."
    );
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

exports.resendLoginOtp = async (
  req,
  res
) => {
  try {
    const userId =
      normalizeText(
        req.body.userId
      );

    const previousOtpId =
      normalizeText(
        req.body.otpId
      );

    if (
      !userId ||
      !previousOtpId
    ) {
      return res.status(400).json({
        success: false,

        code:
          "INVALID_OTP_RESEND_REQUEST",

        message:
          "User ID and previous OTP ID are required.",
      });
    }

    /*
     * Tabbatar da cewa OTP request ɗin
     * da aka turo na user ɗin ne.
     */
    const previousOtp =
      await prisma.loginOtp.findFirst({
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

        code:
          "INVALID_OTP_RESEND_REQUEST",

        message:
          "The OTP resend request is invalid.",
      });
    }

    const elapsedSeconds =
      Math.floor(
        (
          Date.now() -
          new Date(
            previousOtp.createdAt
          ).getTime()
        ) / 1000
      );

    if (
      elapsedSeconds <
      OTP_RESEND_COOLDOWN_SECONDS
    ) {
      const retryAfter =
        OTP_RESEND_COOLDOWN_SECONDS -
        elapsedSeconds;

      res.setHeader(
        "Retry-After",
        String(retryAfter)
      );

      return res.status(429).json({
        success: false,

        code:
          "OTP_RESEND_COOLDOWN",

        message:
          `Please wait ${retryAfter} seconds before requesting another OTP.`,

        retryAfter,
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select:
          safeUserSelect,
      });

    if (
      !user ||
      normalizeRole(user.status) !==
        "ACTIVE"
    ) {
      return res.status(400).json({
        success: false,

        code:
          "INVALID_OTP_RESEND_REQUEST",

        message:
          "The OTP resend request is invalid.",
      });
    }

    const {
      code,
      otpId,
      expiresAt,
    } = await createLoginOtp(
      user.id
    );

    await sendLoginOtpEmail({
      user,
      otp: code,
      expiresAt,

      ipAddress:
        getClientIp(req),
    });

    await recordSecurityLog({
      userId: user.id,
      req,

      event:
        "LOGIN_OTP_RESENT",

      successful: true,

      description:
        "A new login OTP was requested.",
    });

    const response = {
      success: true,

      requiresOtp: true,

      code:
        "LOGIN_OTP_RESENT",

      message:
        "A new verification code has been sent to your email.",

      otpId,

      userId: user.id,

      expiresAt,

      expiresInSeconds:
        10 * 60,

      maskedEmail:
        maskEmail(user.email),
    };

    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      response.developmentOtp =
        code;
    }

    return res.status(200).json(
      response
    );
  } catch (error) {
    return sendAuthError(
      res,
      error,
      "Unable to resend login OTP."
    );
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
   FORGOT PASSWORD

   POST /api/v1/auth/forgot-password
====================================================== */

exports.forgotPassword = async (
  req,
  res
) => {
  try {
    const email = normalizeEmail(
      req.body.email
    );

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email address is required.",
      });
    }

    
    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      });

    /*
     * Generic response domin kada a bayyana
     * ko email yana cikin database.
     */
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          GENERIC_RESET_MESSAGE,
      });
    }

    if (
      normalizeRole(user.status) !==
      "ACTIVE"
    ) {
      return res.status(200).json({
        success: true,
        message:
          GENERIC_RESET_MESSAGE,
      });
    }

    const {
      plainToken,
      tokenHash,
      expiresAt,
    } = generatePasswordResetToken();

    /*
     * Kashe tsofaffin unused reset tokens
     * na wannan user.
     */
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },

      data: {
        usedAt: new Date(),
      },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = normalizeText(
      process.env.FRONTEND_URL
    ).replace(/\/+$/, "");

    const resetUrl =
      `${frontendUrl}/reset-password` +
      `?token=${encodeURIComponent(
        plainToken
      )}`;

    await queuePasswordResetEmail({
      user,
      resetUrl,
    });

    await recordSecurityLog({
      userId: user.id,
      req,
      event: "PASSWORD_RESET",
      successful: true,
      description:
        "Password reset was requested.",
    });

    await writeAuditLog({
      req,
      user,

      action:
        "PASSWORD_RESET_REQUEST",

      description:
        `${user.email} requested a password reset.`,
    });

    const response = {
      success: true,
      message:
        GENERIC_RESET_MESSAGE,
    };

    /*
     * A development kawai za a iya nuna token.
     * Kada ya fito a production.
     */
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      response.developmentResetToken =
        plainToken;

      response.developmentResetUrl =
        resetUrl;
    }

    return res.status(200).json(
      response
    );
  } catch (error) {
    return sendAuthError(
      res,
      error,
      "Unable to process password reset request."
    );
  }
};

/* ======================================================
   RESET PASSWORD

   POST /api/v1/auth/reset-password
====================================================== */

exports.resetPassword = async (
  req,
  res
) => {
  try {
    const token = normalizeText(
      req.body.token
    );

    const newPassword = String(
      req.body.password ||
        req.body.newPassword ||
        ""
    );

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,

        message:
          "Reset token and new password are required.",
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

    const tokenHash = hashToken(token);

    const resetRecord =
      await prisma.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              password: true,
            },
          },
        },
      });

    if (
      !resetRecord ||
      resetRecord.usedAt ||
      resetRecord.expiresAt.getTime() <=
        Date.now()
    ) {
      return res.status(400).json({
        success: false,

        code:
          "INVALID_RESET_TOKEN",

        message:
          "The password reset link is invalid or has expired.",
      });
    }

    if (
      normalizeRole(
        resetRecord.user.status
      ) !== "ACTIVE"
    ) {
      return res.status(403).json({
        success: false,

        message:
          "This account is not active.",
      });
    }

    const samePassword =
      await bcrypt.compare(
        newPassword,
        resetRecord.user.password
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,

        message:
          "Your new password must be different from your current password.",
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
            id:
              resetRecord.user.id,
          },

          data: {
            password:
              hashedPassword,

            passwordChangedAt,

            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        await tx.passwordResetToken.update({
          where: {
            id: resetRecord.id,
          },

          data: {
            usedAt:
              passwordChangedAt,
          },
        });

        /*
         * Kashe duk sauran reset tokens.
         */
        await tx.passwordResetToken.updateMany({
          where: {
            userId:
              resetRecord.user.id,

            id: {
              not:
                resetRecord.id,
            },

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
      userId:
        resetRecord.user.id,

      req,

      event:
        "PASSWORD_RESET",

      successful: true,

      description:
        "Password was reset successfully.",
    });

    await writeAuditLog({
      req,

      user:
        resetRecord.user,

      action:
        "PASSWORD_RESET",

      description:
        `${resetRecord.user.email} reset their password.`,
    });

    await createPasswordNotification({
      user:
        resetRecord.user,

      title:
        "🔐 Password Reset Successful",

      message:
        "Your Ayax APIs password was reset successfully. Existing access tokens have been invalidated. Contact support immediately if you did not perform this action.",
    });

    return res.status(200).json({
      success: true,

      message:
        "Password reset successful. Please sign in with your new password.",
    });
  } catch (error) {
    return sendAuthError(
      res,
      error,
      "Unable to reset password."
    );
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