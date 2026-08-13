const prisma = require("../../config/prisma");

/* ======================================================
   CONSTANTS
====================================================== */

const ALLOWED_STATUSES = [
  "SUCCESSFUL",
  "FAILED",
  "PROCESSING",
];

const PERIODS = [
  "7D",
  "30D",
  "90D",
  "12M",
  "ALL",
];

/* ======================================================
   HELPERS
====================================================== */

const parsePositiveInteger = (
  value,
  fallback,
  maximum
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

const startOfToday = () => {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date;
};

const startOfMonth = () => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );
};

const startOfPreviousMonth = () => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );
};

const endOfPreviousMonth = () => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );
};

const getPeriodStart = (period) => {
  const now = new Date();

  if (period === "7D") {
    const date = new Date(now);
    date.setDate(date.getDate() - 6);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (period === "30D") {
    const date = new Date(now);
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (period === "90D") {
    const date = new Date(now);
    date.setDate(date.getDate() - 89);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (period === "12M") {
    return new Date(
      now.getFullYear(),
      now.getMonth() - 11,
      1
    );
  }

  return null;
};

const normalizePeriod = (value) => {
  const period = String(
    value || "30D"
  )
    .trim()
    .toUpperCase();

  return PERIODS.includes(period)
    ? period
    : "30D";
};

const normalizeService = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const serializeUsage = (usage) => ({
  id: usage.id,
  apiKeyId: usage.apiKeyId,
  endpoint: usage.endpoint,
  method: usage.method,
  service: usage.service,
  reference: usage.reference,
  amount: Number(usage.amount || 0),
  status: usage.status,
  httpStatusCode:
    usage.httpStatusCode,
  errorCode: usage.errorCode,
  errorMessage: usage.errorMessage,
  latency: usage.latency,
  ipAddress: usage.ipAddress,
  createdAt: usage.createdAt,

  apiKey: usage.apiKey
    ? {
        id: usage.apiKey.id,
        name: usage.apiKey.name,
        keyPrefix:
          usage.apiKey.keyPrefix,
        environment:
          usage.apiKey.environment,
      }
    : null,
});

const calculatePercentage = (
  value,
  total
) => {
  if (!total) {
    return 0;
  }

  return Number(
    ((value / total) * 100).toFixed(2)
  );
};

const calculateGrowth = (
  current,
  previous
) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Number(
    (
      ((current - previous) /
        previous) *
      100
    ).toFixed(2)
  );
};

const buildDateWhere = (
  period,
  customStart,
  customEnd
) => {
  if (customStart || customEnd) {
    const createdAt = {};

    if (customStart) {
      const start = new Date(
        customStart
      );

      if (
        Number.isNaN(start.getTime())
      ) {
        const error = new Error(
          "Invalid startDate."
        );

        error.statusCode = 400;

        throw error;
      }

      start.setHours(0, 0, 0, 0);

      createdAt.gte = start;
    }

    if (customEnd) {
      const end = new Date(
        customEnd
      );

      if (
        Number.isNaN(end.getTime())
      ) {
        const error = new Error(
          "Invalid endDate."
        );

        error.statusCode = 400;

        throw error;
      }

      end.setHours(
        23,
        59,
        59,
        999
      );

      createdAt.lte = end;
    }

    return createdAt;
  }

  const periodStart =
    getPeriodStart(period);

  if (!periodStart) {
    return undefined;
  }

  return {
    gte: periodStart,
  };
};

const sendControllerError = (
  res,
  error,
  fallback
) => {
  console.error(fallback, error);

  return res
    .status(error.statusCode || 500)
    .json({
      success: false,
      message:
        error.message || fallback,
    });
};

/* ======================================================
   DEVELOPER USAGE DASHBOARD

   GET /api/v1/api-usage
   GET /api/v1/api-usage/dashboard
   GET /api/v1/api-usage/statistics
   GET /api/v1/api-usage/stats
====================================================== */

exports.getDeveloperStatistics =
  async (req, res) => {
    try {
      const userId = req.user.id;

      const period =
        normalizePeriod(
          req.query.period
        );

      const service =
        normalizeService(
          req.query.service
        );

      const createdAt =
        buildDateWhere(
          period,
          req.query.startDate,
          req.query.endDate
        );

      const baseWhere = {
        userId,
      };

      if (service) {
        baseWhere.service = service;
      }

      if (createdAt) {
        baseWhere.createdAt =
          createdAt;
      }

      const today = startOfToday();
      const thisMonth =
        startOfMonth();

      const previousMonthStart =
        startOfPreviousMonth();

      const previousMonthEnd =
        endOfPreviousMonth();

      const [
        totalCalls,
        successfulCalls,
        failedCalls,
        processingCalls,
        todayCalls,
        monthlyCalls,
        previousMonthlyCalls,
        totalAmount,
        averageLatency,
        activeKeys,
        serviceGroups,
        statusGroups,
        recentRequests,
      ] = await Promise.all([
        prisma.apiUsage.count({
          where: baseWhere,
        }),

        prisma.apiUsage.count({
          where: {
            ...baseWhere,
            status: "SUCCESSFUL",
          },
        }),

        prisma.apiUsage.count({
          where: {
            ...baseWhere,
            status: "FAILED",
          },
        }),

        prisma.apiUsage.count({
          where: {
            ...baseWhere,
            status: "PROCESSING",
          },
        }),

        prisma.apiUsage.count({
          where: {
            userId,
            createdAt: {
              gte: today,
            },
          },
        }),

        prisma.apiUsage.count({
          where: {
            userId,
            createdAt: {
              gte: thisMonth,
            },
          },
        }),

        prisma.apiUsage.count({
          where: {
            userId,
            createdAt: {
              gte:
                previousMonthStart,
              lt:
                previousMonthEnd,
            },
          },
        }),

        prisma.apiUsage.aggregate({
          where: baseWhere,
          _sum: {
            amount: true,
          },
        }),

        prisma.apiUsage.aggregate({
          where: {
            ...baseWhere,
            latency: {
              not: null,
            },
          },
          _avg: {
            latency: true,
          },
        }),

        prisma.apiKey.count({
          where: {
            userId,
            status: "ACTIVE",
            OR: [
              {
                expiresAt: null,
              },
              {
                expiresAt: {
                  gt: new Date(),
                },
              },
            ],
          },
        }),

        prisma.apiUsage.groupBy({
          by: ["service"],
          where: baseWhere,
          _count: {
            _all: true,
          },
          _sum: {
            amount: true,
          },
          _avg: {
            latency: true,
          },
          orderBy: {
            _count: {
              service: "desc",
            },
          },
        }),

        prisma.apiUsage.groupBy({
          by: ["status"],
          where: baseWhere,
          _count: {
            _all: true,
          },
        }),

        prisma.apiUsage.findMany({
          where: baseWhere,
          include: {
            apiKey: {
              select: {
                id: true,
                name: true,
                keyPrefix: true,
                environment: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        }),
      ]);

      const completedCalls =
        successfulCalls +
        failedCalls;

      const successRate =
        calculatePercentage(
          successfulCalls,
          completedCalls
        );

      const failureRate =
        calculatePercentage(
          failedCalls,
          completedCalls
        );

      const monthlyGrowth =
        calculateGrowth(
          monthlyCalls,
          previousMonthlyCalls
        );

      const services =
        serviceGroups.map(
          (item) => ({
            service:
              item.service ||
              "UNKNOWN",
            calls:
              item._count._all,
            amount: Number(
              item._sum.amount || 0
            ),
            averageLatency:
              Math.round(
                Number(
                  item._avg.latency ||
                    0
                )
              ),
            percentage:
              calculatePercentage(
                item._count._all,
                totalCalls
              ),
          })
        );

      const serviceCounts =
        services.reduce(
          (result, item) => {
            const key =
              String(
                item.service ||
                  "UNKNOWN"
              ).toUpperCase();

            result[key] =
              item.calls;

            return result;
          },
          {}
        );

      const statusBreakdown =
        statusGroups.reduce(
          (result, item) => {
            result[item.status] =
              item._count._all;

            return result;
          },
          {
            SUCCESSFUL: 0,
            FAILED: 0,
            PROCESSING: 0,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Usage statistics retrieved successfully.",

        period,

        statistics: {
          totalApiCalls:
            totalCalls,
          totalCalls,
          successfulCalls,
          failedCalls,
          processingCalls,
          todayCalls,
          monthlyCalls,
          previousMonthlyCalls,
          monthlyGrowth,
          successRate,
          failureRate,
          activeApiKeys:
            activeKeys,
          totalAmount: Number(
            totalAmount._sum
              .amount || 0
          ),
          averageLatency:
            Math.round(
              Number(
                averageLatency._avg
                  .latency || 0
              )
            ),

          dataApiCalls:
            serviceCounts.DATA || 0,

          airtimeApiCalls:
            serviceCounts.AIRTIME ||
            0,

          electricityApiCalls:
            serviceCounts
              .ELECTRICITY || 0,

          cableApiCalls:
            serviceCounts.CABLE || 0,

          bvnApiCalls:
            serviceCounts.BVN || 0,

          ninApiCalls:
            serviceCounts.NIN || 0,
        },

        stats: {
          totalApiCalls:
            totalCalls,
          totalCalls,
          successfulCalls,
          failedCalls,
          processingCalls,
          todayCalls,
          monthlyCalls,
          previousMonthlyCalls,
          monthlyGrowth,
          successRate,
          failureRate,
          activeApiKeys:
            activeKeys,
          totalAmount: Number(
            totalAmount._sum
              .amount || 0
          ),
          averageLatency:
            Math.round(
              Number(
                averageLatency._avg
                  .latency || 0
              )
            ),
          dataApiCalls:
            serviceCounts.DATA || 0,
          airtimeApiCalls:
            serviceCounts.AIRTIME ||
            0,
          electricityApiCalls:
            serviceCounts
              .ELECTRICITY || 0,
          cableApiCalls:
            serviceCounts.CABLE || 0,
          bvnApiCalls:
            serviceCounts.BVN || 0,
          ninApiCalls:
            serviceCounts.NIN || 0,
        },

        summary: {
          totalApiCalls:
            totalCalls,
          successfulCalls,
          failedCalls,
          processingCalls,
          successRate,
          monthlyGrowth,
        },

        serviceBreakdown:
          services,

        services,

        statusBreakdown,

        recentRequests:
          recentRequests.map(
            serializeUsage
          ),

        recentUsage:
          recentRequests.map(
            serializeUsage
          ),
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Unable to retrieve usage statistics."
      );
    }
  };

/* ======================================================
   DEVELOPER USAGE HISTORY

   GET /api/v1/api-usage/history
   GET /api/v1/api-usage/requests
====================================================== */

exports.getDeveloperUsageHistory =
  async (req, res) => {
    try {
      const userId = req.user.id;

      const page =
        parsePositiveInteger(
          req.query.page,
          1,
          100000
        );

      const limit =
        parsePositiveInteger(
          req.query.limit,
          20,
          100
        );

      const skip =
        (page - 1) * limit;

      const where = {
        userId,
      };

      if (req.query.status) {
        const status = String(
          req.query.status
        )
          .trim()
          .toUpperCase();

        if (
          !ALLOWED_STATUSES.includes(
            status
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Status must be SUCCESSFUL, FAILED or PROCESSING.",
            });
        }

        where.status = status;
      }

      if (req.query.service) {
        where.service =
          normalizeService(
            req.query.service
          );
      }

      if (req.query.apiKeyId) {
        where.apiKeyId = String(
          req.query.apiKeyId
        ).trim();
      }

      if (req.query.search) {
        const search = String(
          req.query.search
        ).trim();

        where.OR = [
          {
            endpoint: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            reference: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            service: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            errorMessage: {
              contains: search,
              mode: "insensitive",
            },
          },
        ];
      }

      const createdAt =
        buildDateWhere(
          normalizePeriod(
            req.query.period
          ),
          req.query.startDate,
          req.query.endDate
        );

      if (createdAt) {
        where.createdAt = createdAt;
      }

      const [
        usages,
        total,
      ] = await Promise.all([
        prisma.apiUsage.findMany({
          where,
          include: {
            apiKey: {
              select: {
                id: true,
                name: true,
                keyPrefix: true,
                environment: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),

        prisma.apiUsage.count({
          where,
        }),
      ]);

      const totalPages =
        Math.max(
          Math.ceil(total / limit),
          1
        );

      return res.status(200).json({
        success: true,
        message:
          "API usage history retrieved successfully.",

        usages:
          usages.map(
            serializeUsage
          ),

        requests:
          usages.map(
            serializeUsage
          ),

        history:
          usages.map(
            serializeUsage
          ),

        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage:
            page < totalPages,
          hasPreviousPage:
            page > 1,
        },
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Unable to retrieve API usage history."
      );
    }
  };

/* ======================================================
   GET SINGLE USAGE RECORD

   GET /api/v1/api-usage/:id
====================================================== */

exports.getDeveloperUsageById =
  async (req, res) => {
    try {
      const usageId = String(
        req.params.id || ""
      ).trim();

      if (!usageId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Usage ID is required.",
          });
      }

      const usage =
        await prisma.apiUsage.findFirst({
          where: {
            id: usageId,
            userId: req.user.id,
          },
          include: {
            apiKey: {
              select: {
                id: true,
                name: true,
                keyPrefix: true,
                environment: true,
              },
            },
          },
        });

      if (!usage) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "API usage record not found.",
          });
      }

      return res.status(200).json({
        success: true,
        message:
          "API usage record retrieved successfully.",
        usage:
          serializeUsage(usage),
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Unable to retrieve API usage record."
      );
    }
  };