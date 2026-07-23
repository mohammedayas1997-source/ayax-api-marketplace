const crypto = require("crypto");

const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

const DEFAULT_SCOPES = [
  "DATA",
  "AIRTIME",
  "ELECTRICITY",
  "CABLE",
  "BVN",
  "NIN",
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
];

const ALLOWED_ENVIRONMENTS = [
  "PRODUCTION",
  "SANDBOX",
  "DEVELOPMENT",
];

const generateSecretKey = (environment) => {
  let prefix = "ayax_live_";

  if (environment === "SANDBOX") {
    prefix = "ayax_test_";
  }

  if (environment === "DEVELOPMENT") {
    prefix = "ayax_dev_";
  }

  return (
    prefix +
    crypto.randomBytes(32).toString("hex")
  );
};

const hashApiKey = (key) =>
  crypto
    .createHash("sha256")
    .update(key)
    .digest("hex");

const getKeyPrefix = (key) =>
  key.slice(0, 22);

const maskKey = (prefix) =>
  `${prefix || "ayax_key"}••••••••••••`;

const getStartOfToday = () => {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date;
};

const getStartOfMonth = () => {
  const date = new Date();

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
};

const createAuditLog = async ({
  user,
  action,
  module,
  description,
  ip,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: user?.id || null,
        userEmail: user?.email || null,
        action,
        module,
        description,
        ipAddress: ip || null,
      },
    });
  } catch (error) {
    console.error(
      "Audit log error:",
      error.message
    );
  }
};

const emitApiKeyEvent = (
  userId,
  eventName,
  payload
) => {
  try {
    if (typeof emitEvent === "function") {
      emitEvent(
        `user:${userId}`,
        eventName,
        payload
      );
    }
  } catch (error) {
    console.error(
      "Socket emit error:",
      error.message
    );
  }
};

const validateScopes = (scopes) => {
  if (!Array.isArray(scopes)) {
    return DEFAULT_SCOPES;
  }

  const cleanedScopes = scopes
    .map((scope) =>
      String(scope).trim().toUpperCase()
    )
    .filter((scope) =>
      ALLOWED_SCOPES.includes(scope)
    );

  return cleanedScopes.length
    ? [...new Set(cleanedScopes)]
    : DEFAULT_SCOPES;
};

const calculateExpiryDate = (
  expiresInDays
) => {
  if (
    expiresInDays === undefined ||
    expiresInDays === null ||
    expiresInDays === ""
  ) {
    return null;
  }

  const days = Number(expiresInDays);

  if (
    !Number.isInteger(days) ||
    days < 1 ||
    days > 3650
  ) {
    throw new Error(
      "expiresInDays must be between 1 and 3650."
    );
  }

  const expiryDate = new Date();

  expiryDate.setDate(
    expiryDate.getDate() + days
  );

  return expiryDate;
};

const serializeApiKey = (
  apiKey,
  analytics = {}
) => {
  const usageCount =
    Number(analytics.usageCount) || 0;

  const todayCalls =
    Number(analytics.todayCalls) || 0;

  const monthlyCalls =
    Number(analytics.monthlyCalls) || 0;

  const failedCalls =
    Number(analytics.failedCalls) || 0;

  const successfulCalls =
    Number(analytics.successfulCalls) || 0;

  const completedCalls =
    successfulCalls + failedCalls;

  const successRate =
    completedCalls > 0
      ? Number(
          (
            (successfulCalls /
              completedCalls) *
            100
          ).toFixed(2)
        )
      : 100;

  return {
    id: apiKey.id,
    name: apiKey.name,
    key: maskKey(apiKey.keyPrefix),
    keyPrefix: apiKey.keyPrefix,
    status: apiKey.status,
    environment: apiKey.environment,
    scopes: apiKey.scopes,
    rateLimitPerMinute:
      apiKey.rateLimitPerMinute,
    rateLimitPerDay:
      apiKey.rateLimitPerDay,
    expiresAt: apiKey.expiresAt,
    lastUsedAt: apiKey.lastUsedAt,
    revokedAt: apiKey.revokedAt,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
    usageCount,
    todayCalls,
    monthlyCalls,
    failedCalls,
    successfulCalls,
    successRate,
  };
};

exports.getApiKeys = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const apiKeys =
      await prisma.apiKey.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const todayStart =
      getStartOfToday();

    const monthStart =
      getStartOfMonth();

    const keysWithAnalytics =
      await Promise.all(
        apiKeys.map(async (apiKey) => {
          const [
            usageCount,
            todayCalls,
            monthlyCalls,
            failedCalls,
            successfulCalls,
          ] = await Promise.all([
            prisma.apiUsage.count({
              where: {
                apiKeyId: apiKey.id,
              },
            }),

            prisma.apiUsage.count({
              where: {
                apiKeyId: apiKey.id,
                createdAt: {
                  gte: todayStart,
                },
              },
            }),

            prisma.apiUsage.count({
              where: {
                apiKeyId: apiKey.id,
                createdAt: {
                  gte: monthStart,
                },
              },
            }),

            prisma.apiUsage.count({
              where: {
                apiKeyId: apiKey.id,
                status: "FAILED",
              },
            }),

            prisma.apiUsage.count({
              where: {
                apiKeyId: apiKey.id,
                status: "SUCCESSFUL",
              },
            }),
          ]);

          return serializeApiKey(
            apiKey,
            {
              usageCount,
              todayCalls,
              monthlyCalls,
              failedCalls,
              successfulCalls,
            }
          );
        })
      );

    return res.status(200).json({
      success: true,
      message:
        "API keys retrieved successfully.",
      keys: keysWithAnalytics,
    });
  } catch (error) {
    console.error(
      "Get API keys error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve API keys.",
    });
  }
};

exports.generateApiKey = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const {
      name = "Live API Key",
      environment = "PRODUCTION",
      scopes = DEFAULT_SCOPES,
      expiresInDays,
      rateLimitPerMinute = 100,
      rateLimitPerDay = 10000,
    } = req.body;

    const normalizedEnvironment =
      String(environment)
        .trim()
        .toUpperCase();

    if (
      !ALLOWED_ENVIRONMENTS.includes(
        normalizedEnvironment
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid API key environment.",
      });
    }

    const cleanName =
      String(name).trim();

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message:
          "API key name is required.",
      });
    }

    if (cleanName.length > 80) {
      return res.status(400).json({
        success: false,
        message:
          "API key name cannot exceed 80 characters.",
      });
    }

    const minuteLimit = Number(
      rateLimitPerMinute
    );

    const dailyLimit = Number(
      rateLimitPerDay
    );

    if (
      !Number.isInteger(minuteLimit) ||
      minuteLimit < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rate limit per minute must be greater than zero.",
      });
    }

    if (
      !Number.isInteger(dailyLimit) ||
      dailyLimit < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rate limit per day must be greater than zero.",
      });
    }

    const expiryDate =
      calculateExpiryDate(
        expiresInDays
      );

    const cleanScopes =
      validateScopes(scopes);

    const plainKey =
      generateSecretKey(
        normalizedEnvironment
      );

    const keyHash =
      hashApiKey(plainKey);

    const keyPrefix =
      getKeyPrefix(plainKey);

    const apiKey =
      await prisma.apiKey.create({
        data: {
          userId,
          name: cleanName,
          key: keyHash,
          keyPrefix,
          environment:
            normalizedEnvironment,
          scopes: cleanScopes,
          rateLimitPerMinute:
            minuteLimit,
          rateLimitPerDay:
            dailyLimit,
          expiresAt: expiryDate,
          status: "ACTIVE",
        },
      });

    await createAuditLog({
      user: req.user,
      action: "CREATE_API_KEY",
      module: "API_KEYS",
      description: `Generated ${normalizedEnvironment} API key: ${cleanName}`,
      ip: req.ip,
    });

    emitApiKeyEvent(
      userId,
      "api-key-created",
      {
        id: apiKey.id,
        name: apiKey.name,
        environment:
          apiKey.environment,
      }
    );

    return res.status(201).json({
      success: true,
      message:
        "API key generated successfully. Copy and store it securely because it will not be shown again.",
      apiKey: {
        ...serializeApiKey(apiKey),
        key: plainKey,
        secretKey: plainKey,
      },
    });
  } catch (error) {
    console.error(
      "Generate API key error:",
      error
    );

    if (
      error.message?.includes(
        "expiresInDays"
      )
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate API key.",
    });
  }
};

exports.regenerateApiKey = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const apiKeyId = req.params.id;

    const existingKey =
      await prisma.apiKey.findFirst({
        where: {
          id: apiKeyId,
          userId,
        },
      });

    if (!existingKey) {
      return res.status(404).json({
        success: false,
        message:
          "API key not found.",
      });
    }

    const plainKey =
      generateSecretKey(
        existingKey.environment
      );

    const keyHash =
      hashApiKey(plainKey);

    const keyPrefix =
      getKeyPrefix(plainKey);

    const updatedApiKey =
      await prisma.apiKey.update({
        where: {
          id: existingKey.id,
        },
        data: {
          key: keyHash,
          keyPrefix,
          status: "ACTIVE",
          revokedAt: null,
          lastUsedAt: null,
        },
      });

    await createAuditLog({
      user: req.user,
      action:
        "REGENERATE_API_KEY",
      module: "API_KEYS",
      description: `Regenerated API key: ${existingKey.name}`,
      ip: req.ip,
    });

    emitApiKeyEvent(
      userId,
      "api-key-regenerated",
      {
        id: updatedApiKey.id,
        name: updatedApiKey.name,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "API key regenerated successfully. Copy and store the new key securely.",
      apiKey: {
        ...serializeApiKey(
          updatedApiKey
        ),
        key: plainKey,
        secretKey: plainKey,
      },
    });
  } catch (error) {
    console.error(
      "Regenerate API key error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to regenerate API key.",
    });
  }
};

exports.revokeApiKey = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const apiKeyId = req.params.id;

    const existingKey =
      await prisma.apiKey.findFirst({
        where: {
          id: apiKeyId,
          userId,
        },
      });

    if (!existingKey) {
      return res.status(404).json({
        success: false,
        message:
          "API key not found.",
      });
    }

    if (
      existingKey.status ===
      "REVOKED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "API key is already revoked.",
      });
    }

    const updatedApiKey =
      await prisma.apiKey.update({
        where: {
          id: existingKey.id,
        },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
      });

    await createAuditLog({
      user: req.user,
      action: "REVOKE_API_KEY",
      module: "API_KEYS",
      description: `Revoked API key: ${existingKey.name}`,
      ip: req.ip,
    });

    emitApiKeyEvent(
      userId,
      "api-key-revoked",
      {
        id: updatedApiKey.id,
        name: updatedApiKey.name,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "API key revoked successfully.",
      apiKey:
        serializeApiKey(
          updatedApiKey
        ),
    });
  } catch (error) {
    console.error(
      "Revoke API key error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to revoke API key.",
    });
  }
};

exports.deleteApiKey = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const apiKeyId = req.params.id;

    const existingKey =
      await prisma.apiKey.findFirst({
        where: {
          id: apiKeyId,
          userId,
        },
      });

    if (!existingKey) {
      return res.status(404).json({
        success: false,
        message:
          "API key not found.",
      });
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.apiUsage.updateMany({
          where: {
            apiKeyId:
              existingKey.id,
          },
          data: {
            apiKeyId: null,
          },
        });

        await tx.apiKey.delete({
          where: {
            id: existingKey.id,
          },
        });
      }
    );

    await createAuditLog({
      user: req.user,
      action: "DELETE_API_KEY",
      module: "API_KEYS",
      description: `Deleted API key: ${existingKey.name}`,
      ip: req.ip,
    });

    emitApiKeyEvent(
      userId,
      "api-key-deleted",
      {
        id: existingKey.id,
        name: existingKey.name,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "API key deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete API key error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete API key.",
    });
  }
};