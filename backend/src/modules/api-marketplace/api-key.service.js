const crypto = require("crypto");
const prisma = require("../../config/prisma");

/* ======================================================
   CONSTANTS
====================================================== */

const KEY_PREFIXES = {
  PRODUCTION: "ayax_live_",
  SANDBOX: "ayax_test_",
  DEVELOPMENT: "ayax_dev_",
};

const ALLOWED_STATUSES = [
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
];

const ALLOWED_ENVIRONMENTS = [
  "PRODUCTION",
  "SANDBOX",
  "DEVELOPMENT",
];

const ALLOWED_SCOPES = [
  "DATA",
  "AIRTIME",
  "ELECTRICITY",
  "CABLE",
  "BVN",
  "NIN",
  "PRINTING",
  "SMS",
  "GSM",
  "TRANSACTIONS",
  "WALLET",
  "WEBHOOKS",
  "IDENTITY",
];

const DEFAULT_SCOPES = [
  "DATA",
  "AIRTIME",
  "ELECTRICITY",
  "CABLE",
  "BVN",
  "NIN",
];

const MAX_CREATE_ATTEMPTS = 5;

/* ======================================================
   HELPERS
====================================================== */

const normalizeText = (value) =>
  String(value || "").trim();

const normalizeUppercase = (value) =>
  normalizeText(value).toUpperCase();

const createHttpError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
};

const hashApiKey = (plainApiKey) => {
  return crypto
    .createHash("sha256")
    .update(String(plainApiKey))
    .digest("hex");
};

const generatePlainApiKey = (
  environment = "PRODUCTION"
) => {
  const normalizedEnvironment =
    normalizeUppercase(environment) ||
    "PRODUCTION";

  const prefix =
    KEY_PREFIXES[
      normalizedEnvironment
    ] || KEY_PREFIXES.PRODUCTION;

  /*
   * 32 random bytes = 256 bits of entropy.
   */
  const randomPart = crypto
    .randomBytes(32)
    .toString("hex");

  return `${prefix}${randomPart}`;
};

const generateKeyPrefix = (
  plainApiKey
) => {
  /*
   * Example:
   * ayax_live_a82f1b9c
   */
  return String(plainApiKey).slice(
    0,
    18
  );
};

const normalizeEnvironment = (
  environment
) => {
  const normalized =
    normalizeUppercase(
      environment || "PRODUCTION"
    );

  if (
    !ALLOWED_ENVIRONMENTS.includes(
      normalized
    )
  ) {
    throw createHttpError(
      "Invalid API key environment."
    );
  }

  return normalized;
};

const normalizeScopes = (
  scopes
) => {
  if (
    scopes === undefined ||
    scopes === null
  ) {
    return DEFAULT_SCOPES;
  }

  if (!Array.isArray(scopes)) {
    throw createHttpError(
      "API key scopes must be an array."
    );
  }

  const normalizedScopes = [
    ...new Set(
      scopes
        .map(normalizeUppercase)
        .filter(Boolean)
    ),
  ];

  if (normalizedScopes.length === 0) {
    throw createHttpError(
      "At least one API scope is required."
    );
  }

  const invalidScope =
    normalizedScopes.find(
      (scope) =>
        !ALLOWED_SCOPES.includes(scope)
    );

  if (invalidScope) {
    throw createHttpError(
      `Invalid API scope: ${invalidScope}`
    );
  }

  return normalizedScopes;
};

const normalizeRateLimit = (
  value,
  fallback,
  maximum,
  fieldName
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > maximum
  ) {
    throw createHttpError(
      `${fieldName} must be between 1 and ${maximum}.`
    );
  }

  return parsed;
};

const normalizeExpiryDate = (
  expiresAt
) => {
  if (!expiresAt) {
    return null;
  }

  const parsedDate =
    new Date(expiresAt);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw createHttpError(
      "Invalid API key expiry date."
    );
  }

  if (
    parsedDate.getTime() <=
    Date.now()
  ) {
    throw createHttpError(
      "API key expiry date must be in the future."
    );
  }

  return parsedDate;
};

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
};

const safeApiKeySelect = {
  id: true,
  userId: true,
  name: true,
  keyPrefix: true,
  status: true,
  environment: true,
  scopes: true,
  rateLimitPerMinute: true,
  rateLimitPerDay: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,

  user: {
    select: safeUserSelect,
  },
};

const serializeApiKey = (
  apiKey
) => {
  if (!apiKey) {
    return null;
  }

  return {
    id: apiKey.id,
    userId: apiKey.userId,

    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,

    status: apiKey.status,
    environment:
      apiKey.environment,

    scopes: apiKey.scopes || [],

    rateLimitPerMinute:
      apiKey.rateLimitPerMinute,

    rateLimitPerDay:
      apiKey.rateLimitPerDay,

    expiresAt: apiKey.expiresAt,
    lastUsedAt: apiKey.lastUsedAt,
    revokedAt: apiKey.revokedAt,

    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,

    usageCount: 0,

    user: apiKey.user || null,
  };
};

const getExistingUser = async (
  userId
) => {
  if (!userId) {
    throw createHttpError(
      "User ID is required."
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: safeUserSelect,
    });

  if (!user) {
    throw createHttpError(
      "User account was not found.",
      404
    );
  }

  if (user.status !== "ACTIVE") {
    throw createHttpError(
      "API keys cannot be created for an inactive account.",
      403
    );
  }

  return user;
};

const expireOldKeys = async () => {
  const now = new Date();

  await prisma.apiKey.updateMany({
    where: {
      status: "ACTIVE",

      expiresAt: {
        lte: now,
      },
    },

    data: {
      status: "EXPIRED",
      revokedAt: now,
    },
  });
};

const generateUniqueKeyData =
  async (environment) => {
    for (
      let attempt = 1;
      attempt <= MAX_CREATE_ATTEMPTS;
      attempt += 1
    ) {
      const plainApiKey =
        generatePlainApiKey(
          environment
        );

      const keyHash =
        hashApiKey(plainApiKey);

      const existing =
        await prisma.apiKey.findUnique({
          where: {
            key: keyHash,
          },

          select: {
            id: true,
          },
        });

      if (!existing) {
        return {
          plainApiKey,
          keyHash,
          keyPrefix:
            generateKeyPrefix(
              plainApiKey
            ),
        };
      }
    }

    throw createHttpError(
      "Unable to generate a unique API key.",
      500
    );
  };

/* ======================================================
   GET API KEYS
====================================================== */

exports.getKeys = async ({
  userId,
  status,
  environment,
} = {}) => {
  await expireOldKeys();

  const where = {};

  if (userId) {
    where.userId =
      normalizeText(userId);
  }

  if (
    status &&
    normalizeUppercase(status) !==
      "ALL"
  ) {
    const normalizedStatus =
      normalizeUppercase(status);

    if (
      !ALLOWED_STATUSES.includes(
        normalizedStatus
      )
    ) {
      throw createHttpError(
        "Invalid API key status."
      );
    }

    where.status =
      normalizedStatus;
  }

  if (
    environment &&
    normalizeUppercase(environment) !==
      "ALL"
  ) {
    where.environment =
      normalizeEnvironment(
        environment
      );
  }

  const keys =
    await prisma.apiKey.findMany({
      where,

      select: safeApiKeySelect,

      orderBy: {
        createdAt: "desc",
      },
    });

  return keys.map(
    serializeApiKey
  );
};

/* ======================================================
   GET SINGLE API KEY
====================================================== */

exports.getKey = async (id) => {
  if (!id) {
    throw createHttpError(
      "API key ID is required."
    );
  }

  await expireOldKeys();

  const apiKey =
    await prisma.apiKey.findUnique({
      where: {
        id,
      },

      select: safeApiKeySelect,
    });

  return serializeApiKey(apiKey);
};

/* ======================================================
   CREATE API KEY
====================================================== */

exports.createKey = async (
  data = {}
) => {
  const userId =
    normalizeText(data.userId);

  const user =
    await getExistingUser(userId);

  const name =
    normalizeText(data.name) ||
    "Live API Key";

  if (name.length > 100) {
    throw createHttpError(
      "API key name cannot exceed 100 characters."
    );
  }

  const environment =
    normalizeEnvironment(
      data.environment ||
        "PRODUCTION"
    );

  const scopes =
    normalizeScopes(data.scopes);

  const rateLimitPerMinute =
    normalizeRateLimit(
      data.rateLimitPerMinute,
      100,
      10000,
      "Rate limit per minute"
    );

  const rateLimitPerDay =
    normalizeRateLimit(
      data.rateLimitPerDay,
      10000,
      10000000,
      "Rate limit per day"
    );

  if (
    rateLimitPerDay <
    rateLimitPerMinute
  ) {
    throw createHttpError(
      "Daily rate limit cannot be lower than the per-minute rate limit."
    );
  }

  const expiresAt =
    normalizeExpiryDate(
      data.expiresAt
    );

  const {
    plainApiKey,
    keyHash,
    keyPrefix,
  } =
    await generateUniqueKeyData(
      environment
    );

  const apiKey =
    await prisma.apiKey.create({
      data: {
        userId: user.id,
        name,

        /*
         * IMPORTANT:
         * key column now stores SHA-256 hash,
         * not the full plain API key.
         */
        key: keyHash,
        keyPrefix,

        status: "ACTIVE",
        environment,
        scopes,

        rateLimitPerMinute,
        rateLimitPerDay,

        expiresAt,
        revokedAt: null,
        lastUsedAt: null,
      },

      select: safeApiKeySelect,
    });

  return {
    ...serializeApiKey(apiKey),

    /*
     * Wannan zai fito sau ɗaya kawai.
     * Ba a adana shi a database.
     */
    plainApiKey,

    warning:
      "Copy this API key now. It will not be shown again.",
  };
};

/* ======================================================
   REGENERATE / ROTATE API KEY
====================================================== */

exports.regenerateKey = async (
  id
) => {
  if (!id) {
    throw createHttpError(
      "API key ID is required."
    );
  }

  const existing =
    await prisma.apiKey.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,
        environment: true,
      },
    });

  if (!existing) {
    throw createHttpError(
      "API key was not found.",
      404
    );
  }

  const {
    plainApiKey,
    keyHash,
    keyPrefix,
  } =
    await generateUniqueKeyData(
      existing.environment
    );

  const apiKey =
    await prisma.apiKey.update({
      where: {
        id,
      },

      data: {
        key: keyHash,
        keyPrefix,

        status: "ACTIVE",
        revokedAt: null,
        lastUsedAt: null,
      },

      select: safeApiKeySelect,
    });

  return {
    ...serializeApiKey(apiKey),

    plainApiKey,

    warning:
      "The previous API key has stopped working. Copy the new key now because it will not be shown again.",
  };
};

/* ======================================================
   CHANGE API KEY STATUS
====================================================== */

exports.changeStatus = async (
  id,
  status
) => {
  if (!id) {
    throw createHttpError(
      "API key ID is required."
    );
  }

  const normalizedStatus =
    normalizeUppercase(status);

  if (
    !ALLOWED_STATUSES.includes(
      normalizedStatus
    )
  ) {
    throw createHttpError(
      "Invalid API key status."
    );
  }

  const existing =
    await prisma.apiKey.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        expiresAt: true,
      },
    });

  if (!existing) {
    throw createHttpError(
      "API key was not found.",
      404
    );
  }

  if (
    normalizedStatus ===
      "ACTIVE" &&
    existing.expiresAt &&
    new Date(
      existing.expiresAt
    ).getTime() <= Date.now()
  ) {
    throw createHttpError(
      "An expired API key cannot be activated. Update its expiry date or rotate the key."
    );
  }

  const apiKey =
    await prisma.apiKey.update({
      where: {
        id,
      },

      data: {
        status: normalizedStatus,

        revokedAt:
          normalizedStatus ===
          "ACTIVE"
            ? null
            : new Date(),
      },

      select: safeApiKeySelect,
    });

  return serializeApiKey(apiKey);
};

/* ======================================================
   DELETE API KEY
====================================================== */

exports.deleteKey = async (
  id
) => {
  if (!id) {
    throw createHttpError(
      "API key ID is required."
    );
  }

  const existing =
    await prisma.apiKey.findUnique({
      where: {
        id,
      },

      select: safeApiKeySelect,
    });

  if (!existing) {
    throw createHttpError(
      "API key was not found.",
      404
    );
  }

  /*
   * ApiUsage.apiKey relation uses onDelete: SetNull,
   * saboda haka usage logs za su ci gaba da kasancewa.
   */
  await prisma.apiKey.delete({
    where: {
      id,
    },
  });

  return serializeApiKey(existing);
};

/* ======================================================
   VERIFY API KEY

   Za a yi amfani da wannan a middleware.
====================================================== */
exports.verifyApiKey = async (plainApiKey) => {
  const cleanKey = normalizeText(plainApiKey);
  if (!cleanKey) {
    console.log("[AUTH DEBUG]: No clean key provided");
    return null;
  }

  const keyHash = hashApiKey(cleanKey);
  console.log("[AUTH DEBUG]: Key Hash being queried:", keyHash);

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: keyHash },
    select: safeApiKeySelect,
  });

  if (!apiKey) {
    console.log("[AUTH DEBUG]: No matching key found in Database for hash:", keyHash);
    return null;
  }

  console.log("[AUTH DEBUG]: Found API Key:", {
    id: apiKey.id,
    status: apiKey.status,
    userStatus: apiKey.user?.status,
    scopes: apiKey.scopes,
  });

  if (apiKey.status !== "ACTIVE") {
    console.log("[AUTH DEBUG]: Key is not ACTIVE");
    return null;
  }

  if (apiKey.user?.status !== "ACTIVE") {
    console.log("[AUTH DEBUG]: User is not ACTIVE, actual:", apiKey.user?.status);
    return null;
  }

  return serializeApiKey(apiKey);
};

/* ======================================================
   CHECK API KEY SCOPE
====================================================== */

exports.hasScope = (
  apiKey,
  requiredScope
) => {
  const normalizedScope =
    normalizeUppercase(
      requiredScope
    );

  return Boolean(
    apiKey &&
      Array.isArray(
        apiKey.scopes
      ) &&
      apiKey.scopes.includes(
        normalizedScope
      )
  );
};

/* ======================================================
   STATISTICS
====================================================== */

exports.statistics =
  async () => {
    await expireOldKeys();

    const [
      total,
      active,
      revoked,
      expired,
      production,
      sandbox,
      development,
    ] = await Promise.all([
      prisma.apiKey.count(),

      prisma.apiKey.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.apiKey.count({
        where: {
          status: "REVOKED",
        },
      }),

      prisma.apiKey.count({
        where: {
          status: "EXPIRED",
        },
      }),

      prisma.apiKey.count({
        where: {
          environment:
            "PRODUCTION",
        },
      }),

      prisma.apiKey.count({
        where: {
          environment:
            "SANDBOX",
        },
      }),

      prisma.apiKey.count({
        where: {
          environment:
            "DEVELOPMENT",
        },
      }),
    ]);

    return {
      total,
      active,
      revoked,
      expired,

      environments: {
        production,
        sandbox,
        development,
      },
    };
  };

  exports.updateLastUsed = async (id) => {
  return prisma.apiKey.update({
    where: { id },
    data: {
      lastUsedAt: new Date(),
    },
  });
};

/* ======================================================
   EXPORT SECURITY HELPERS
====================================================== */

exports.hashApiKey =
  hashApiKey;

exports.generatePlainApiKey =
  generatePlainApiKey;