const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

/* ======================================================
   CONSTANTS
====================================================== */

const JWT_ALGORITHM = "HS256";
const ACTIVE_USER_STATUS = "ACTIVE";

/* ======================================================
   HELPERS
====================================================== */

const normalizeText = (value) =>
  String(value || "").trim();

const sendUnauthorized = (
  res,
  code,
  message
) => {
  return res.status(401).json({
    success: false,
    code,
    message,
  });
};

const getBearerToken = (req) => {
  const authorization =
    normalizeText(
      req.headers.authorization
    );

  if (!authorization) {
    return null;
  }

  const parts =
    authorization.split(/\s+/);

  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !==
      "bearer"
  ) {
    return null;
  }

  return normalizeText(parts[1]);
};

const getJwtSecret = () => {
  const secret =
    normalizeText(
      process.env.JWT_SECRET
    );

  if (!secret) {
    const error = new Error(
      "JWT_SECRET is not configured."
    );

    error.code =
      "JWT_CONFIGURATION_ERROR";

    throw error;
  }

  if (
    process.env.NODE_ENV ===
      "production" &&
    secret.length < 64
  ) {
    const error = new Error(
      "JWT_SECRET must contain at least 64 characters in production."
    );

    error.code =
      "JWT_CONFIGURATION_ERROR";

    throw error;
  }

  return secret;
};

const getVerifyOptions = () => {
  const options = {
    algorithms: [
      JWT_ALGORITHM,
    ],

    clockTolerance: 5,
  };

  if (process.env.JWT_ISSUER) {
    options.issuer =
      process.env.JWT_ISSUER;
  }

  if (process.env.JWT_AUDIENCE) {
    options.audience =
      process.env.JWT_AUDIENCE;
  }

  return options;
};

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,

  passwordChangedAt: true,

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

const tokenWasIssuedBeforePasswordChange = (
  decoded,
  passwordChangedAt
) => {
  if (
    !passwordChangedAt ||
    !decoded?.iat
  ) {
    return false;
  }

  const issuedAtMilliseconds =
    Number(decoded.iat) * 1000;

  const passwordChangedMilliseconds =
    new Date(
      passwordChangedAt
    ).getTime();

  /*
   * Æ˜aramin tolerance domin kada token
   * da aka bayar a daidai second É—in
   * password change ya samu kuskure.
   */
  return (
    issuedAtMilliseconds <
    passwordChangedMilliseconds -
      1000
  );
};

const removeExpiredRevokedTokens =
  async () => {
    try {
      await prisma.revokedToken.deleteMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      });
    } catch (error) {
      console.error(
        "Unable to clean expired revoked tokens:",
        error.message
      );
    }
  };

/* ======================================================
   JWT AUTHENTICATION MIDDLEWARE
====================================================== */

module.exports = async (
  req,
  res,
  next
) => {
  try {
    const token =
      getBearerToken(req);

    if (!token) {
      return sendUnauthorized(
        res,
        "TOKEN_REQUIRED",
        "A valid Bearer token is required."
      );
    }

    const decoded = jwt.verify(
      token,
      getJwtSecret(),
      getVerifyOptions()
    );

    if (
      !decoded ||
      typeof decoded !== "object"
    ) {
      return sendUnauthorized(
        res,
        "INVALID_TOKEN",
        "The access token is invalid."
      );
    }

    /*
     * Kada refresh token ko wani token daban
     * ya shiga protected routes.
     */
    if (
      decoded.tokenType !==
      "ACCESS"
    ) {
      return sendUnauthorized(
        res,
        "INVALID_TOKEN_TYPE",
        "This token cannot be used as an access token."
      );
    }

    const userId =
      normalizeText(
        decoded.sub ||
          decoded.id
      );

    if (!userId) {
      return sendUnauthorized(
        res,
        "INVALID_TOKEN_SUBJECT",
        "The access token does not contain a valid user identifier."
      );
    }

    /*
     * Token É—inmu yana da jti.
     * Idan babu jti, kada mu amince da shi.
     */
    const tokenId =
      normalizeText(decoded.jti);

    if (!tokenId) {
      return sendUnauthorized(
        res,
        "INVALID_TOKEN_ID",
        "The access token does not contain a valid token identifier."
      );
    }

    /*
     * Duba ko an revoke token lokacin logout.
     */
    const revokedToken =
      await prisma.revokedToken.findUnique({
        where: {
          tokenId,
        },

        select: {
          id: true,
          expiresAt: true,
        },
      });

    if (revokedToken) {
      return sendUnauthorized(
        res,
        "TOKEN_REVOKED",
        "This session has been logged out or revoked."
      );
    }

    /*
     * Karanta current user daga database.
     * Kada a dogara da role/status na token kawai.
     */
    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select:
          safeUserSelect,
      });

    if (!user) {
      return sendUnauthorized(
        res,
        "ACCOUNT_NOT_FOUND",
        "The account associated with this token was not found."
      );
    }

    if (
      String(user.status)
        .toUpperCase() !==
      ACTIVE_USER_STATUS
    ) {
      return res.status(403).json({
        success: false,

        code:
          "ACCOUNT_NOT_ACTIVE",

        message:
          "This account is inactive, suspended, or blocked.",
      });
    }

    /*
     * Idan password ya canza bayan token ya fito,
     * tsohon token ba zai sake aiki ba.
     */
    if (
      tokenWasIssuedBeforePasswordChange(
        decoded,
        user.passwordChangedAt
      )
    ) {
      return sendUnauthorized(
        res,
        "PASSWORD_CHANGED",
        "Your password has changed. Please sign in again."
      );
    }

req.user = user;

req.auth = {
  tokenId,

  tokenType:
    decoded.tokenType,

  issuedAt:
    decoded.iat || null,

  expiresAt:
    decoded.exp || null,

  issuer:
    decoded.iss || null,

  audience:
    decoded.aud || null,

  subject:
    user.id,
};

    /*
     * Share expired-token cleanup ba tare
     * da jira request ya tsaya ba.
     */
    removeExpiredRevokedTokens();

    return next();
  } catch (error) {
    if (
      error?.name ===
      "TokenExpiredError"
    ) {
      return sendUnauthorized(
        res,
        "TOKEN_EXPIRED",
        "Your session has expired. Please sign in again."
      );
    }

    if (
      error?.name ===
      "NotBeforeError"
    ) {
      return sendUnauthorized(
        res,
        "TOKEN_NOT_ACTIVE",
        "This access token is not active yet."
      );
    }

    if (
      error?.name ===
      "JsonWebTokenError"
    ) {
      return sendUnauthorized(
        res,
        "INVALID_TOKEN",
        "The access token is invalid."
      );
    }

    console.error(
      "Authentication middleware error:",
      error
    );

    return res.status(500).json({
      success: false,

      code:
        "AUTHENTICATION_ERROR",

      message:
        "Unable to authenticate this request.",
    });
  }
};

