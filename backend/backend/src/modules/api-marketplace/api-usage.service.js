const prisma = require("../../config/prisma");

/* ======================================================
   CONSTANTS
====================================================== */

const ALLOWED_STATUSES = [
  "SUCCESSFUL",
  "FAILED",
  "PROCESSING",
];

const ALLOWED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

const SENSITIVE_FIELDS = new Set([
  "password",
  "pin",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "apiKey",
  "api_key",
  "secret",
  "secretKey",
  "privateKey",
  "cardNumber",
  "cvv",
]);

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

const parsePositiveInteger = (
  value,
  fallback,
  maximum = 100
) => {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return Math.min(parsed, maximum);
};

const normalizeStatus = (
  status,
  fallback = null
) => {
  if (!status) {
    return fallback;
  }

  const normalized =
    normalizeUppercase(status);

  if (
    !ALLOWED_STATUSES.includes(
      normalized
    )
  ) {
    throw createHttpError(
      "Invalid API usage status."
    );
  }

  return normalized;
};

const normalizeMethod = (
  method
) => {
  const normalized =
    normalizeUppercase(
      method || "POST"
    );

  if (
    !ALLOWED_METHODS.includes(
      normalized
    )
  ) {
    throw createHttpError(
      "Invalid HTTP method."
    );
  }

  return normalized;
};

const sanitizeValue = (
  value,
  depth = 0
) => {
  if (depth > 8) {
    return "[MAX_DEPTH_REACHED]";
  }

  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeValue(
        item,
        depth + 1
      )
    );
  }

  if (typeof value === "object") {
    const sanitized = {};

    for (
      const [key, item] of
      Object.entries(value)
    ) {
      if (
        SENSITIVE_FIELDS.has(key)
      ) {
        sanitized[key] =
          "[REDACTED]";

        continue;
      }

      sanitized[key] =
        sanitizeValue(
          item,
          depth + 1
        );
    }

    return sanitized;
  }

  if (
    typeof value === "string" &&
    value.length > 10000
  ) {
    return `${value.slice(
      0,
      10000
    )}[TRUNCATED]`;
  }

  return value;
};

const stringifySafely = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  try {
    return JSON.stringify(
      sanitizeValue(value)
    );
  } catch {
    return JSON.stringify({
      error:
        "Unable to serialize payload.",
    });
  }
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
  name: true,
  keyPrefix: true,
  status: true,
  environment: true,
  scopes: true,
  rateLimitPerMinute: true,
  rateLimitPerDay: true,
  expiresAt: true,
  lastUsedAt: true,
};

/* ======================================================
   GET USAGE LOGS
====================================================== */

exports.getUsageLogs = async ({
  search,
  status,
  userId,
  apiKeyId,
  service,
  method,
  startDate,
  endDate,
  page = 1,
  limit = 20,
} = {}) => {
  const safePage =
    parsePositiveInteger(
      page,
      1,
      100000
    );

  const safeLimit =
    parsePositiveInteger(
      limit,
      20,
      100
    );

  const where = {};

  if (userId) {
    where.userId =
      normalizeText(userId);
  }

  if (apiKeyId) {
    where.apiKeyId =
      normalizeText(apiKeyId);
  }

  if (status) {
    const normalizedStatus =
      normalizeUppercase(status);

    if (
      normalizedStatus !==
      "ALL"
    ) {
      where.status =
        normalizeStatus(
          normalizedStatus
        );
    }
  }

  if (service) {
    where.service = {
      contains:
        normalizeText(service),
      mode: "insensitive",
    };
  }

  if (method) {
    where.method =
      normalizeMethod(method);
  }

  if (search) {
    const searchValue =
      normalizeText(search);

    where.OR = [
      {
        endpoint: {
          contains: searchValue,
          mode: "insensitive",
        },
      },
      {
        method: {
          contains: searchValue,
          mode: "insensitive",
        },
      },
      {
        ipAddress: {
          contains: searchValue,
          mode: "insensitive",
        },
      },
      {
        service: {
          contains: searchValue,
          mode: "insensitive",
        },
      },
      {
        reference: {
          contains: searchValue,
          mode: "insensitive",
        },
      },
      {
        errorCode: {
          contains: searchValue,
          mode: "insensitive",
        },
      },
    ];
  }

  if (
    startDate ||
    endDate
  ) {
    where.createdAt = {};

    if (startDate) {
      const parsedStart =
        new Date(startDate);

      if (
        Number.isNaN(
          parsedStart.getTime()
        )
      ) {
        throw createHttpError(
          "Invalid start date."
        );
      }

      parsedStart.setHours(
        0,
        0,
        0,
        0
      );

      where.createdAt.gte =
        parsedStart;
    }

    if (endDate) {
      const parsedEnd =
        new Date(endDate);

      if (
        Number.isNaN(
          parsedEnd.getTime()
        )
      ) {
        throw createHttpError(
          "Invalid end date."
        );
      }

      parsedEnd.setHours(
        23,
        59,
        59,
        999
      );

      where.createdAt.lte =
        parsedEnd;
    }
  }

  const skip =
    (safePage - 1) *
    safeLimit;

  const [
    usages,
    total,
  ] = await Promise.all([
    prisma.apiUsage.findMany({
      where,

      select: {
        id: true,
        userId: true,
        apiKeyId: true,

        endpoint: true,
        method: true,
        service: true,
        reference: true,

        amount: true,
        status: true,

        httpStatusCode: true,
        errorCode: true,
        errorMessage: true,

        ipAddress: true,
        userAgent: true,
        latency: true,

        createdAt: true,
        updatedAt: true,

        user: {
          select:
            safeUserSelect,
        },

        apiKey: {
          select:
            safeApiKeySelect,
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      skip,
      take: safeLimit,
    }),

    prisma.apiUsage.count({
      where,
    }),
  ]);

  const totalPages =
    Math.max(
      Math.ceil(
        total / safeLimit
      ),
      1
    );

  return {
    usages,

    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: totalPages,
      totalPages,

      hasNextPage:
        safePage < totalPages,

      hasPreviousPage:
        safePage > 1,
    },
  };
};

/* ======================================================
   GET USAGE BY ID
====================================================== */

exports.getUsageById = async (
  id
) => {
  if (!id) {
    throw createHttpError(
      "Usage log ID is required."
    );
  }

  return prisma.apiUsage.findUnique({
    where: {
      id,
    },

    select: {
      id: true,
      userId: true,
      apiKeyId: true,

      endpoint: true,
      method: true,
      service: true,
      reference: true,

      amount: true,
      status: true,

      httpStatusCode: true,
      errorCode: true,
      errorMessage: true,

      requestBody: true,
      responseBody: true,

      ipAddress: true,
      userAgent: true,
      latency: true,

      createdAt: true,
      updatedAt: true,

      user: {
        select:
          safeUserSelect,
      },

      apiKey: {
        select:
          safeApiKeySelect,
      },
    },
  });
};

/* ======================================================
   CREATE USAGE LOG
====================================================== */

exports.createUsageLog = async (
  data = {}
) => {
  const userId =
    normalizeText(data.userId);

  const endpoint =
    normalizeText(data.endpoint);

  if (!userId) {
    throw createHttpError(
      "User ID is required."
    );
  }

  if (!endpoint) {
    throw createHttpError(
      "API endpoint is required."
    );
  }

  const status =
    normalizeStatus(
      data.status,
      "PROCESSING"
    );

  return prisma.apiUsage.create({
    data: {
      userId,

      apiKeyId:
        normalizeText(
          data.apiKeyId
        ) || null,

      endpoint,

      method:
        normalizeMethod(
          data.method
        ),

      service:
        normalizeText(
          data.service
        ) || null,

      reference:
        normalizeText(
          data.reference
        ) || null,

      amount: Number(
        data.amount || 0
      ),

      status,

      httpStatusCode:
        Number.isInteger(
          Number(
            data.httpStatusCode
          )
        )
          ? Number(
              data.httpStatusCode
            )
          : null,

      errorCode:
        normalizeText(
          data.errorCode
        ) || null,

      errorMessage:
        normalizeText(
          data.errorMessage
        ) || null,

      requestBody:
        stringifySafely(
          data.requestBody
        ),

      responseBody:
        stringifySafely(
          data.responseBody
        ),

      ipAddress:
        normalizeText(
          data.ipAddress
        ) || null,

      userAgent:
        normalizeText(
          data.userAgent
        ) || null,

      latency:
        Number.isFinite(
          Number(data.latency)
        )
          ? Math.max(
              0,
              Math.round(
                Number(
                  data.latency
                )
              )
            )
          : null,
    },
  });
};

/* ======================================================
   UPDATE USAGE LOG

   A fara log da PROCESSING sannan
   a sabunta shi bayan request ya gama.
====================================================== */

exports.updateUsageLog = async (
  id,
  data = {}
) => {
  if (!id) {
    throw createHttpError(
      "Usage log ID is required."
    );
  }

  const updateData = {};

  if (data.status) {
    updateData.status =
      normalizeStatus(
        data.status
      );
  }

  if (
    data.amount !== undefined
  ) {
    updateData.amount =
      Number(
        data.amount || 0
      );
  }

  if (
    data.httpStatusCode !==
    undefined
  ) {
    updateData.httpStatusCode =
      Number(
        data.httpStatusCode
      ) || null;
  }

  if (
    data.errorCode !==
    undefined
  ) {
    updateData.errorCode =
      normalizeText(
        data.errorCode
      ) || null;
  }

  if (
    data.errorMessage !==
    undefined
  ) {
    updateData.errorMessage =
      normalizeText(
        data.errorMessage
      ) || null;
  }

  if (
    data.responseBody !==
    undefined
  ) {
    updateData.responseBody =
      stringifySafely(
        data.responseBody
      );
  }

  if (
    data.latency !== undefined
  ) {
    updateData.latency =
      Number.isFinite(
        Number(data.latency)
      )
        ? Math.max(
            0,
            Math.round(
              Number(
                data.latency
              )
            )
          )
        : null;
  }

  return prisma.apiUsage.update({
    where: {
      id,
    },

    data: updateData,
  });
};

/* ======================================================
   API KEY RATE USAGE

   Ana amfani da wannan wajen tabbatar da
   per-minute da per-day limits.
====================================================== */

exports.getApiKeyRateUsage = async (
  apiKeyId
) => {
  if (!apiKeyId) {
    throw createHttpError(
      "API key ID is required."
    );
  }

  const now = new Date();

  const minuteStart =
    new Date(
      now.getTime() -
        60 * 1000
    );

  const dayStart =
    new Date(now);

  dayStart.setHours(
    0,
    0,
    0,
    0
  );

  const [
    minuteUsage,
    dailyUsage,
  ] = await Promise.all([
    prisma.apiUsage.count({
      where: {
        apiKeyId,

        createdAt: {
          gte: minuteStart,
        },
      },
    }),

    prisma.apiUsage.count({
      where: {
        apiKeyId,

        createdAt: {
          gte: dayStart,
        },
      },
    }),
  ]);

  return {
    minuteUsage,
    dailyUsage,
    minuteStart,
    dayStart,
  };
};

/* ======================================================
   CHECK RATE LIMIT
====================================================== */

exports.checkApiKeyRateLimit =
  async (apiKey) => {
    if (!apiKey?.id) {
      throw createHttpError(
        "Valid API key record is required.",
        401
      );
    }

    const {
      minuteUsage,
      dailyUsage,
    } =
      await exports.getApiKeyRateUsage(
        apiKey.id
      );

    const minuteLimit =
      Number(
        apiKey.rateLimitPerMinute ||
          100
      );

    const dailyLimit =
      Number(
        apiKey.rateLimitPerDay ||
          10000
      );

    if (
      minuteUsage >=
      minuteLimit
    ) {
      const error =
        createHttpError(
          "API key minute rate limit exceeded.",
          429
        );

      error.code =
        "API_MINUTE_LIMIT_EXCEEDED";

      throw error;
    }

    if (
      dailyUsage >=
      dailyLimit
    ) {
      const error =
        createHttpError(
          "API key daily rate limit exceeded.",
          429
        );

      error.code =
        "API_DAILY_LIMIT_EXCEEDED";

      throw error;
    }

    return {
      allowed: true,

      minute: {
        used: minuteUsage,
        limit: minuteLimit,
        remaining: Math.max(
          minuteLimit -
            minuteUsage,
          0
        ),
      },

      day: {
        used: dailyUsage,
        limit: dailyLimit,
        remaining: Math.max(
          dailyLimit -
            dailyUsage,
          0
        ),
      },
    };
  };

/* ======================================================
   STATISTICS
====================================================== */

exports.statistics = async ({
  userId,
  apiKeyId,
} = {}) => {
  const where = {};

  if (userId) {
    where.userId =
      normalizeText(userId);
  }

  if (apiKeyId) {
    where.apiKeyId =
      normalizeText(apiKeyId);
  }

  const [
    total,
    successful,
    failed,
    processing,
    revenue,
    averageLatency,
  ] = await Promise.all([
    prisma.apiUsage.count({
      where,
    }),

    prisma.apiUsage.count({
      where: {
        ...where,
        status: "SUCCESSFUL",
      },
    }),

    prisma.apiUsage.count({
      where: {
        ...where,
        status: "FAILED",
      },
    }),

    prisma.apiUsage.count({
      where: {
        ...where,
        status: "PROCESSING",
      },
    }),

    prisma.apiUsage.aggregate({
      where: {
        ...where,
        status: "SUCCESSFUL",
      },

      _sum: {
        amount: true,
      },
    }),

    prisma.apiUsage.aggregate({
      where,

      _avg: {
        latency: true,
      },
    }),
  ]);

  const successRate =
    total > 0
      ? Number(
          (
            (successful / total) *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    total,
    successful,
    failed,
    processing,

    revenue: Number(
      revenue._sum.amount || 0
    ),

    averageLatency:
      Number(
        averageLatency._avg
          .latency || 0
      ),

    successRate,
  };
};