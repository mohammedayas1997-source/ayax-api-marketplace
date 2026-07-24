const prisma = require("../config/prisma");
const createAuditLog = require("../utils/audit");
const { emitEvent } = require("../config/socket");

/* ======================================================
   CONSTANTS
====================================================== */

const NOTIFICATION_TYPES = [
  "INFO",
  "SUCCESS",
  "WARNING",
  "ERROR",
  "UPDATE",
  "PROMOTION",
  "SYSTEM",
];

const NOTIFICATION_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
];

const NOTIFICATION_AUDIENCES = [
  "ALL",
  "ROLE",
  "USER",
  "MULTIPLE_USERS",
];

const NOTIFICATION_CHANNELS = [
  "IN_APP",
  "EMAIL",
  "PUSH",
  "SMS",
];

const HISTORY_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PROCESSING",
  "SENT",
  "PARTIALLY_SENT",
  "FAILED",
  "CANCELLED",
];

/* ======================================================
   HELPERS
====================================================== */

const normalizeText = (value) =>
  String(value || "").trim();

const normalizeUppercase = (value) =>
  normalizeText(value).toUpperCase();

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

const uniqueStrings = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .map((value) =>
          normalizeText(value)
        )
        .filter(Boolean)
    ),
  ];
};

const normalizeChannels = (channels) => {
  if (!Array.isArray(channels)) {
    return ["IN_APP"];
  }

  const normalized = [
    ...new Set(
      channels
        .map(normalizeUppercase)
        .filter((channel) =>
          NOTIFICATION_CHANNELS.includes(
            channel
          )
        )
    ),
  ];

  return normalized.length > 0
    ? normalized
    : ["IN_APP"];
};

const parseOptionalDate = (
  value,
  fieldName
) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    const error = new Error(
      `${fieldName} is invalid.`
    );

    error.statusCode = 400;

    throw error;
  }

  return date;
};

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

const serializeRecipient = (
  recipient
) => ({
  id: recipient.id,
  notificationId:
    recipient.notificationId,
  userId: recipient.userId,
  status: recipient.status,

  inAppDelivered:
    recipient.inAppDelivered,
  emailDelivered:
    recipient.emailDelivered,
  pushDelivered:
    recipient.pushDelivered,
  smsDelivered:
    recipient.smsDelivered,

  deliveredAt:
    recipient.deliveredAt,
  readAt: recipient.readAt,
  clickedAt: recipient.clickedAt,
  failedAt: recipient.failedAt,
  failureReason:
    recipient.failureReason,

  createdAt: recipient.createdAt,
  updatedAt: recipient.updatedAt,

  user: recipient.user
    ? {
        id: recipient.user.id,
        name: recipient.user.name,
        email: recipient.user.email,
        phone: recipient.user.phone,
        role: recipient.user.role,
      }
    : null,
});

const serializeNotification = (
  notification
) => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,

  type: notification.type,
  priority: notification.priority,
  audience: notification.audience,

  targetRole:
    notification.targetRole,
  targetUserId:
    notification.targetUserId,

  channels: notification.channels,

  actionText:
    notification.actionText,
  actionUrl:
    notification.actionUrl,
  imageUrl:
    notification.imageUrl,

  status: notification.status,
  isPinned: notification.isPinned,

  scheduledAt:
    notification.scheduledAt,
  expiresAt:
    notification.expiresAt,
  sentAt: notification.sentAt,
  cancelledAt:
    notification.cancelledAt,

  createdById:
    notification.createdById,
  createdByName:
    notification.createdByName,
  createdByEmail:
    notification.createdByEmail,

  totalRecipients:
    notification.totalRecipients,
  deliveredCount:
    notification.deliveredCount,
  readCount:
    notification.readCount,
  clickedCount:
    notification.clickedCount,
  failedCount:
    notification.failedCount,

  failureReason:
    notification.failureReason,
  metadata:
    notification.metadata,

  createdAt:
    notification.createdAt,
  updatedAt:
    notification.updatedAt,

  recipients:
    Array.isArray(
      notification.recipients
    )
      ? notification.recipients.map(
          serializeRecipient
        )
      : undefined,
});

const getErrorStatus = (
  error,
  fallback = 500
) => {
  if (
    Number.isInteger(
      error?.statusCode
    )
  ) {
    return error.statusCode;
  }

  if (
    Number.isInteger(error?.status)
  ) {
    return error.status;
  }

  if (error?.code === "P2025") {
    return 404;
  }

  if (error?.code === "P2002") {
    return 409;
  }

  if (
    error?.code === "P2003" ||
    error?.code === "P2009"
  ) {
    return 400;
  }

  return fallback;
};

const sendError = (
  res,
  error,
  fallbackMessage,
  fallbackStatus = 500
) => {
  console.error(
    fallbackMessage,
    error
  );

  return res
    .status(
      getErrorStatus(
        error,
        fallbackStatus
      )
    )
    .json({
      success: false,
      message:
        error?.message ||
        fallbackMessage,
    });
};

const writeAuditLog = async ({
  req,
  action,
  description,
}) => {
  try {
    await createAuditLog({
      user: req.user,
      action,
      module: "NOTIFICATIONS",
      description,
      ip:
        req.ip ||
        req.headers[
          "x-forwarded-for"
        ] ||
        null,
    });
  } catch (error) {
    console.error(
      "Notification audit error:",
      error.message
    );
  }
};

const publishEvent = (
  eventName,
  payload
) => {
  try {
    if (
      typeof emitEvent ===
      "function"
    ) {
      emitEvent(
        eventName,
        payload
      );
    }
  } catch (error) {
    console.error(
      `Notification socket error (${eventName}):`,
      error.message
    );
  }
};

/* ======================================================
   RESOLVE AUDIENCE USERS
====================================================== */

const resolveAudienceUsers = async ({
  audience,
  targetRole,
  targetUserId,
  targetEmail,
  userIds,
}) => {
  const select = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
  };

  if (audience === "ALL") {
    return prisma.user.findMany({
      select,
    });
  }

  if (audience === "ROLE") {
    if (!targetRole) {
      const error = new Error(
        "Target role is required."
      );

      error.statusCode = 400;

      throw error;
    }

    return prisma.user.findMany({
      where: {
        role: targetRole,
      },
      select,
    });
  }

  if (audience === "USER") {
    if (
      !targetUserId &&
      !targetEmail
    ) {
      const error = new Error(
        "User ID or email is required."
      );

      error.statusCode = 400;

      throw error;
    }

    const user =
      await prisma.user.findFirst({
        where: {
          OR: [
            targetUserId
              ? {
                  id: targetUserId,
                }
              : undefined,

            targetEmail
              ? {
                  email: {
                    equals:
                      targetEmail,
                    mode: "insensitive",
                  },
                }
              : undefined,
          ].filter(Boolean),
        },
        select,
      });

    if (!user) {
      const error = new Error(
        "Target user was not found."
      );

      error.statusCode = 404;

      throw error;
    }

    return [user];
  }

  if (
    audience ===
    "MULTIPLE_USERS"
  ) {
    const cleanUserIds =
      uniqueStrings(userIds);

    if (
      cleanUserIds.length === 0
    ) {
      const error = new Error(
        "At least one user ID is required."
      );

      error.statusCode = 400;

      throw error;
    }

    return prisma.user.findMany({
      where: {
        id: {
          in: cleanUserIds,
        },
      },
      select,
    });
  }

  const error = new Error(
    "Invalid notification audience."
  );

  error.statusCode = 400;

  throw error;
};

/* ======================================================
   CREATE RECIPIENT RECORDS
====================================================== */

const createRecipientRecords = async ({
  transactionClient,
  notificationId,
  users,
  channels,
}) => {
  if (
    !Array.isArray(users) ||
    users.length === 0
  ) {
    return {
      count: 0,
    };
  }

  const hasInApp =
    channels.includes("IN_APP");

  return transactionClient
    .notificationRecipient
    .createMany({
      data: users.map((user) => ({
        notificationId,
        userId: user.id,

        status: hasInApp
          ? "DELIVERED"
          : "PENDING",

        inAppDelivered:
          hasInApp,

        emailDelivered: false,
        pushDelivered: false,
        smsDelivered: false,

        deliveredAt: hasInApp
          ? new Date()
          : null,
      })),

      skipDuplicates: true,
    });
};

/* ======================================================
   SEND NOTIFICATION

   POST /api/v1/admin/notifications/send
   POST /api/v1/super-admin/notifications/send
====================================================== */

exports.sendNotification = async (
  req,
  res
) => {
  try {
    const title = normalizeText(
      req.body.title
    );

    const message = normalizeText(
      req.body.message
    );

    const type =
      normalizeUppercase(
        req.body.type || "INFO"
      );

    const priority =
      normalizeUppercase(
        req.body.priority ||
          "NORMAL"
      );

    const audience =
      normalizeUppercase(
        req.body.audience ||
          "ALL"
      );

    const targetRole =
      req.body.targetRole ||
      req.body.role
        ? normalizeUppercase(
            req.body.targetRole ||
              req.body.role
          )
        : null;

    const targetUserId =
      normalizeText(
        req.body.targetUserId ||
          req.body.userId
      ) || null;

    const targetEmail =
      normalizeText(
        req.body.targetEmail ||
          req.body.email
      ) || null;

    const userIds = uniqueStrings(
      req.body.userIds
    );

    const channels =
      normalizeChannels(
        req.body.channels
      );

    const actionText =
      normalizeText(
        req.body.actionText
      ) || null;

    const actionUrl =
      normalizeText(
        req.body.actionUrl
      ) || null;

    const imageUrl =
      normalizeText(
        req.body.imageUrl
      ) || null;

    const scheduledAt =
      parseOptionalDate(
        req.body.scheduledAt,
        "Scheduled date"
      );

    const expiresAt =
      parseOptionalDate(
        req.body.expiresAt,
        "Expiry date"
      );

    const isPinned =
      req.body.isPinned === true ||
      priority === "CRITICAL";

    if (!title) {
      return res.status(400).json({
        success: false,
        message:
          "Notification title is required.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message:
          "Notification message is required.",
      });
    }

    if (
      !NOTIFICATION_TYPES.includes(
        type
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification type.",
      });
    }

    if (
      !NOTIFICATION_PRIORITIES.includes(
        priority
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification priority.",
      });
    }

    if (
      !NOTIFICATION_AUDIENCES.includes(
        audience
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification audience.",
      });
    }

    if (
      scheduledAt &&
      scheduledAt <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Scheduled date must be in the future.",
      });
    }

    if (
      expiresAt &&
      expiresAt <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expiry date must be in the future.",
      });
    }

    if (
      scheduledAt &&
      expiresAt &&
      expiresAt <= scheduledAt
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expiry date must be after the scheduled date.",
      });
    }

    const users =
      await resolveAudienceUsers({
        audience,
        targetRole,
        targetUserId,
        targetEmail,
        userIds,
      });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No users matched the selected audience.",
      });
    }

    const shouldSchedule =
      Boolean(scheduledAt);

    const notification =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.notification.create({
              data: {
                title,
                message,
                type,
                priority,
                audience,

                targetRole:
                  audience === "ROLE"
                    ? targetRole
                    : null,

                targetUserId:
                  audience === "USER"
                    ? users[0]?.id ||
                      null
                    : null,

                channels,

                actionText,
                actionUrl,
                imageUrl,

                status:
                  shouldSchedule
                    ? "SCHEDULED"
                    : "PROCESSING",

                isPinned,
                scheduledAt,
                expiresAt,

                createdById:
                  req.user.id,

                createdByName:
                  req.user.name ||
                  null,

                createdByEmail:
                  req.user.email ||
                  null,

                totalRecipients:
                  users.length,

                metadata: {
                  targetUserIds:
                    users.map(
                      (user) => user.id
                    ),

                  requestedChannels:
                    channels,
                },
              },
            });

          if (!shouldSchedule) {
            const result =
              await createRecipientRecords({
                transactionClient: tx,
                notificationId:
                  created.id,
                users,
                channels,
              });

            const deliveredCount =
              channels.includes(
                "IN_APP"
              )
                ? result.count
                : 0;

            return tx.notification.update({
              where: {
                id: created.id,
              },
              data: {
                status:
                  result.count ===
                  users.length
                    ? "SENT"
                    : "PARTIALLY_SENT",

                sentAt: new Date(),

                deliveredCount,
                failedCount:
                  Math.max(
                    users.length -
                      result.count,
                    0
                  ),
              },
              include: {
                recipients: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                      },
                    },
                  },
                },
              },
            });
          }

          return tx.notification.findUnique({
            where: {
              id: created.id,
            },
          });
        }
      );

    if (!shouldSchedule) {
      publishEvent(
        "notification-created",
        {
          notification:
            serializeNotification(
              notification
            ),

          recipientUserIds:
            users.map(
              (user) => user.id
            ),
        }
      );

      for (const user of users) {
        publishEvent(
          "user-notification-created",
          {
            userId: user.id,

            notification:
              serializeNotification(
                notification
              ),
          }
        );
      }
    }

    await writeAuditLog({
      req,

      action: shouldSchedule
        ? "SCHEDULE_NOTIFICATION"
        : "SEND_NOTIFICATION",

      description:
        `${req.user.email} ${
          shouldSchedule
            ? "scheduled"
            : "sent"
        } notification "${title}" to ${users.length} recipient(s).`,
    });

    return res
      .status(
        shouldSchedule ? 201 : 200
      )
      .json({
        success: true,

        message: shouldSchedule
          ? "Notification scheduled successfully."
          : "Notification sent successfully.",

        notification:
          serializeNotification(
            notification
          ),

        recipientCount:
          users.length,
      });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to send notification.",
      400
    );
  }
};

/* ======================================================
   GET NOTIFICATION HISTORY

   GET /api/v1/admin/notifications/history
====================================================== */

exports.getNotificationHistory =
  async (req, res) => {
    try {
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

      const {
        search,
        status,
        type,
        priority,
        audience,
        startDate,
        endDate,
      } = req.query;

      const where = {};

      if (status) {
        const normalized =
          normalizeUppercase(
            status
          );

        if (
          !HISTORY_STATUSES.includes(
            normalized
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid notification status.",
            });
        }

        where.status =
          normalized;
      }

      if (type) {
        const normalized =
          normalizeUppercase(type);

        if (
          !NOTIFICATION_TYPES.includes(
            normalized
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid notification type.",
            });
        }

        where.type = normalized;
      }

      if (priority) {
        const normalized =
          normalizeUppercase(
            priority
          );

        if (
          !NOTIFICATION_PRIORITIES.includes(
            normalized
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid priority.",
            });
        }

        where.priority =
          normalized;
      }

      if (audience) {
        const normalized =
          normalizeUppercase(
            audience
          );

        if (
          !NOTIFICATION_AUDIENCES.includes(
            normalized
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid audience.",
            });
        }

        where.audience =
          normalized;
      }

      if (search) {
        const searchValue =
          normalizeText(search);

        where.OR = [
          {
            title: {
              contains:
                searchValue,
              mode: "insensitive",
            },
          },
          {
            message: {
              contains:
                searchValue,
              mode: "insensitive",
            },
          },
          {
            createdByName: {
              contains:
                searchValue,
              mode: "insensitive",
            },
          },
          {
            createdByEmail: {
              contains:
                searchValue,
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
          const start =
            parseOptionalDate(
              startDate,
              "Start date"
            );

          start.setHours(
            0,
            0,
            0,
            0
          );

          where.createdAt.gte =
            start;
        }

        if (endDate) {
          const end =
            parseOptionalDate(
              endDate,
              "End date"
            );

          end.setHours(
            23,
            59,
            59,
            999
          );

          where.createdAt.lte =
            end;
        }
      }

      const [
        notifications,
        total,
      ] = await Promise.all([
        prisma.notification.findMany({
          where,

          orderBy: {
            createdAt: "desc",
          },

          skip,
          take: limit,

          include: {
            _count: {
              select: {
                recipients: true,
              },
            },
          },
        }),

        prisma.notification.count({
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
          "Notification history retrieved successfully.",

        notifications:
          notifications.map(
            (notification) => ({
              ...serializeNotification(
                notification
              ),

              recipientRecords:
                notification._count
                  ?.recipients || 0,
            })
          ),

        history:
          notifications.map(
            serializeNotification
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
      return sendError(
        res,
        error,
        "Unable to retrieve notification history."
      );
    }
  };

/* ======================================================
   GET SINGLE NOTIFICATION

   GET /api/v1/admin/notifications/:id
====================================================== */

exports.getNotificationById =
  async (req, res) => {
    try {
      const notificationId =
        normalizeText(
          req.params.id
        );

      const notification =
        await prisma.notification.findUnique({
          where: {
            id: notificationId,
          },

          include: {
            recipients: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                  },
                },
              },

              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification was not found.",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Notification retrieved successfully.",

        notification:
          serializeNotification(
            notification
          ),

        analytics: {
          totalRecipients:
            notification.totalRecipients,

          delivered:
            notification.deliveredCount,

          read:
            notification.readCount,

          clicked:
            notification.clickedCount,

          failed:
            notification.failedCount,

          deliveryRate:
            calculatePercentage(
              notification.deliveredCount,
              notification.totalRecipients
            ),

          readRate:
            calculatePercentage(
              notification.readCount,
              notification.totalRecipients
            ),

          clickRate:
            calculatePercentage(
              notification.clickedCount,
              notification.totalRecipients
            ),
        },
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to retrieve notification."
      );
    }
  };

/* ======================================================
   STATISTICS

   GET /api/v1/admin/notifications/statistics
====================================================== */

exports.getNotificationStatistics =
  async (req, res) => {
    try {
      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const [
        totalNotifications,
        sentNotifications,
        scheduledNotifications,
        failedNotifications,
        sentToday,
        aggregateTotals,
        typeGroups,
        statusGroups,
      ] = await Promise.all([
        prisma.notification.count(),

        prisma.notification.count({
          where: {
            status: {
              in: [
                "SENT",
                "PARTIALLY_SENT",
              ],
            },
          },
        }),

        prisma.notification.count({
          where: {
            status: "SCHEDULED",
          },
        }),

        prisma.notification.count({
          where: {
            status: "FAILED",
          },
        }),

        prisma.notification.count({
          where: {
            sentAt: {
              gte: today,
            },
          },
        }),

        prisma.notification.aggregate({
          _sum: {
            totalRecipients: true,
            deliveredCount: true,
            readCount: true,
            clickedCount: true,
            failedCount: true,
          },
        }),

        prisma.notification.groupBy({
          by: ["type"],

          _count: {
            _all: true,
          },
        }),

        prisma.notification.groupBy({
          by: ["status"],

          _count: {
            _all: true,
          },
        }),
      ]);

      const totalRecipients =
        Number(
          aggregateTotals._sum
            .totalRecipients || 0
        );

      const delivered =
        Number(
          aggregateTotals._sum
            .deliveredCount || 0
        );

      const read =
        Number(
          aggregateTotals._sum
            .readCount || 0
        );

      const clicked =
        Number(
          aggregateTotals._sum
            .clickedCount || 0
        );

      const failed =
        Number(
          aggregateTotals._sum
            .failedCount || 0
        );

      return res.status(200).json({
        success: true,

        message:
          "Notification statistics retrieved successfully.",

        statistics: {
          totalNotifications,
          sentNotifications,
          scheduledNotifications,
          failedNotifications,
          sentToday,

          totalRecipients,
          delivered,
          read,
          clicked,
          failed,

          deliveryRate:
            calculatePercentage(
              delivered,
              totalRecipients
            ),

          readRate:
            calculatePercentage(
              read,
              totalRecipients
            ),

          clickRate:
            calculatePercentage(
              clicked,
              totalRecipients
            ),
        },

        typeBreakdown:
          typeGroups.reduce(
            (result, item) => {
              result[item.type] =
                item._count._all;

              return result;
            },
            {}
          ),

        statusBreakdown:
          statusGroups.reduce(
            (result, item) => {
              result[item.status] =
                item._count._all;

              return result;
            },
            {}
          ),
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to retrieve notification statistics."
      );
    }
  };

/* ======================================================
   PROCESS SCHEDULED NOTIFICATIONS

   POST /api/v1/admin/notifications/process-scheduled

   Ana iya kiran wannan da cron job.
====================================================== */

exports.processScheduledNotifications =
  async (req, res) => {
    try {
      const now = new Date();

      const scheduledNotifications =
        await prisma.notification.findMany({
          where: {
            status: "SCHEDULED",

            scheduledAt: {
              lte: now,
            },

            OR: [
              {
                expiresAt: null,
              },
              {
                expiresAt: {
                  gt: now,
                },
              },
            ],
          },

          orderBy: {
            scheduledAt: "asc",
          },

          take: 100,
        });

      const results = [];

      for (
        const notification of
        scheduledNotifications
      ) {
        try {
          const metadataUserIds =
            Array.isArray(
              notification.metadata
                ?.targetUserIds
            )
              ? notification.metadata
                  .targetUserIds
              : [];

          const users =
            await resolveAudienceUsers({
              audience:
                notification.audience,

              targetRole:
                notification.targetRole,

              targetUserId:
                notification.targetUserId,

              targetEmail: null,

              userIds:
                metadataUserIds,
            });

          const updated =
            await prisma.$transaction(
              async (tx) => {
                await tx.notification.update({
                  where: {
                    id: notification.id,
                  },

                  data: {
                    status:
                      "PROCESSING",
                  },
                });

                const result =
                  await createRecipientRecords({
                    transactionClient:
                      tx,

                    notificationId:
                      notification.id,

                    users,

                    channels:
                      notification.channels,
                  });

                const deliveredCount =
                  notification.channels.includes(
                    "IN_APP"
                  )
                    ? result.count
                    : 0;

                return tx.notification.update({
                  where: {
                    id: notification.id,
                  },

                  data: {
                    status:
                      result.count ===
                      users.length
                        ? "SENT"
                        : "PARTIALLY_SENT",

                    sentAt: new Date(),

                    totalRecipients:
                      users.length,

                    deliveredCount,

                    failedCount:
                      Math.max(
                        users.length -
                          result.count,
                        0
                      ),
                  },
                });
              }
            );

          publishEvent(
            "notification-created",
            {
              notification:
                serializeNotification(
                  updated
                ),

              recipientUserIds:
                users.map(
                  (user) => user.id
                ),
            }
          );

          results.push({
            id: updated.id,
            success: true,
          });
        } catch (error) {
          await prisma.notification.update({
            where: {
              id: notification.id,
            },

            data: {
              status: "FAILED",
              failureReason:
                error.message,
            },
          });

          results.push({
            id: notification.id,
            success: false,
            message:
              error.message,
          });
        }
      }

      return res.status(200).json({
        success: true,

        message:
          "Scheduled notifications processed.",

        processed:
          results.length,

        results,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to process scheduled notifications."
      );
    }
  };

/* ======================================================
   CANCEL SCHEDULED NOTIFICATION

   PATCH /api/v1/admin/notifications/:id/cancel
====================================================== */

exports.cancelNotification =
  async (req, res) => {
    try {
      const notificationId =
        normalizeText(
          req.params.id
        );

      const notification =
        await prisma.notification.findUnique({
          where: {
            id: notificationId,
          },
        });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification was not found.",
        });
      }

      if (
        notification.status !==
        "SCHEDULED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only scheduled notifications can be cancelled.",
        });
      }

      const updated =
        await prisma.notification.update({
          where: {
            id: notification.id,
          },

          data: {
            status: "CANCELLED",
            cancelledAt:
              new Date(),
          },
        });

      await writeAuditLog({
        req,
        action:
          "CANCEL_NOTIFICATION",

        description:
          `${req.user.email} cancelled notification "${notification.title}".`,
      });

      publishEvent(
        "notification-cancelled",
        {
          notificationId:
            updated.id,
        }
      );

      return res.status(200).json({
        success: true,

        message:
          "Notification cancelled successfully.",

        notification:
          serializeNotification(
            updated
          ),
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to cancel notification.",
        400
      );
    }
  };

/* ======================================================
   DELETE NOTIFICATION

   DELETE /api/v1/admin/notifications/:id
====================================================== */

exports.deleteNotification = async (
  req,
  res
) => {
  try {
    const notificationId =
      normalizeText(req.params.id);

    const notification =
      await prisma.notification.findUnique({
        where: {
          id: notificationId,
        },

        select: {
          id: true,
          title: true,
        },
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification was not found.",
      });
    }

    await prisma.notification.delete({
      where: {
        id: notification.id,
      },
    });

    await writeAuditLog({
      req,
      action:
        "DELETE_NOTIFICATION",

      description:
        `${req.user.email} deleted notification "${notification.title}".`,
    });

    publishEvent(
      "notification-deleted",
      {
        notificationId:
          notification.id,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Notification deleted successfully.",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to delete notification."
    );
  }
};

/* ======================================================
   SEARCH USERS FOR NOTIFICATION FORM

   GET /api/v1/admin/notifications/users/search
====================================================== */

exports.searchNotificationUsers =
  async (req, res) => {
    try {
      const search =
        normalizeText(
          req.query.search ||
            req.query.q
        );

      if (search.length < 2) {
        return res.status(200).json({
          success: true,
          users: [],
        });
      }

      const users =
        await prisma.user.findMany({
          where: {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                phone: {
                  contains: search,
                },
              },
            ],
          },

          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 20,
        });

      return res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to search users."
      );
    }
  };