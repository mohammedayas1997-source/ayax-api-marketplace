const crypto = require("crypto");

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

const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "STAFF_ADMIN",
  "CUSTOMER_SERVICE",
  "CUSTOMER",
];

/* ======================================================
   HELPERS
====================================================== */

const normalizeText = (value) =>
  String(value || "").trim();

const normalizeUppercase = (value) =>
  normalizeText(value).toUpperCase();

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

const createBatchId = () => {
  if (
    typeof crypto.randomUUID ===
    "function"
  ) {
    return crypto.randomUUID();
  }

  return crypto
    .randomBytes(16)
    .toString("hex");
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

const serializeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
};

const serializeNotification = (
  notification
) => ({
  id: notification.id,
  batchId: notification.batchId,

  userId: notification.userId,

  title: notification.title,
  message: notification.message,

  type: notification.type,
  priority: notification.priority,
  audience: notification.audience,
  targetRole: notification.targetRole,

  actionText:
    notification.actionText,
  actionUrl:
    notification.actionUrl,
  imageUrl:
    notification.imageUrl,

  isRead: notification.isRead,
  readAt: notification.readAt,

  createdById:
    notification.createdById,
  createdByName:
    notification.createdByName,
  createdByEmail:
    notification.createdByEmail,

  createdAt:
    notification.createdAt,
  updatedAt:
    notification.updatedAt,

  user: serializeUser(
    notification.user
  ),
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

  if (error?.code === "P2003") {
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
      "Notification audit log error:",
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
      `Socket event error (${eventName}):`,
      error.message
    );
  }
};

/* ======================================================
   RESOLVE RECIPIENTS
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
      where: {
        status: "ACTIVE",
      },
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

    if (
      !USER_ROLES.includes(
        targetRole
      )
    ) {
      const error = new Error(
        "Invalid target role."
      );

      error.statusCode = 400;

      throw error;
    }

    return prisma.user.findMany({
      where: {
        role: targetRole,
        status: "ACTIVE",
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
        "Target user ID or email is required."
      );

      error.statusCode = 400;

      throw error;
    }

    const conditions = [];

    if (targetUserId) {
      conditions.push({
        id: targetUserId,
      });
    }

    if (targetEmail) {
      conditions.push({
        email: {
          equals: targetEmail,
          mode: "insensitive",
        },
      });
    }

    const user =
      await prisma.user.findFirst({
        where: {
          OR: conditions,
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
   SEND NOTIFICATION

   POST /api/v1/admin/notifications/send
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

    const targetRole = normalizeUppercase(
      req.body.targetRole ||
        req.body.role
    );

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
      title.length > 200
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Notification title cannot exceed 200 characters.",
      });
    }

    if (
      message.length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Notification message cannot exceed 5000 characters.",
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

    const users =
      await resolveAudienceUsers({
        audience,
        targetRole:
          targetRole || null,
        targetUserId,
        targetEmail,
        userIds,
      });

    if (
      !Array.isArray(users) ||
      users.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "No users matched the selected audience.",
      });
    }

    const batchId = createBatchId();

    const commonData = {
      batchId,
      title,
      message,
      type,
      priority,
      audience,

      targetRole:
        audience === "ROLE"
          ? targetRole
          : null,

      actionText,
      actionUrl,
      imageUrl,

      createdById:
        req.user?.id || null,

      createdByName:
        req.user?.name || null,

      createdByEmail:
        req.user?.email || null,
    };

    await prisma.notification.createMany({
      data: users.map((user) => ({
        ...commonData,
        userId: user.id,
      })),
    });

    const createdNotifications =
      await prisma.notification.findMany({
        where: {
          batchId,
        },

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
          createdAt: "asc",
        },
      });

    for (
      const notification of
      createdNotifications
    ) {
      const serialized =
        serializeNotification(
          notification
        );

      publishEvent(
        "user-notification-created",
        {
          userId:
            notification.userId,

          notification:
            serialized,
        }
      );
    }

    publishEvent(
      "notification-broadcast-created",
      {
        batchId,
        audience,
        targetRole:
          audience === "ROLE"
            ? targetRole
            : null,
        recipientCount:
          createdNotifications.length,
        notification: {
          batchId,
          title,
          message,
          type,
          priority,
          audience,
          actionText,
          actionUrl,
          imageUrl,
          createdAt:
            createdNotifications[0]
              ?.createdAt ||
            new Date(),
        },
      }
    );

    await writeAuditLog({
      req,
      action:
        "SEND_NOTIFICATION",
      description:
        `${req.user?.email || "Admin"} sent notification "${title}" to ${createdNotifications.length} user(s).`,
    });

    return res.status(201).json({
      success: true,
      message:
        "Notification sent successfully.",

      notification: {
        batchId,
        title,
        message,
        type,
        priority,
        audience,

        targetRole:
          audience === "ROLE"
            ? targetRole
            : null,

        actionText,
        actionUrl,
        imageUrl,

        recipientCount:
          createdNotifications.length,

        createdAt:
          createdNotifications[0]
            ?.createdAt ||
          new Date(),
      },

      recipientCount:
        createdNotifications.length,
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
   GET ADMIN NOTIFICATION HISTORY

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

      const search =
        normalizeText(
          req.query.search
        );

      const type =
        normalizeUppercase(
          req.query.type
        );

      const priority =
        normalizeUppercase(
          req.query.priority
        );

      const audience =
        normalizeUppercase(
          req.query.audience
        );

      const where = {};

      if (search) {
        where.OR = [
          {
            title: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            message: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            createdByName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            createdByEmail: {
              contains: search,
              mode: "insensitive",
            },
          },
        ];
      }

      if (type) {
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

        where.type = type;
      }

      if (priority) {
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

        where.priority = priority;
      }

      if (audience) {
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

        where.audience = audience;
      }

      const grouped =
        await prisma.notification.groupBy({
          by: [
            "batchId",
            "title",
            "message",
            "type",
            "priority",
            "audience",
            "targetRole",
            "actionText",
            "actionUrl",
            "imageUrl",
            "createdById",
            "createdByName",
            "createdByEmail",
            "createdAt",
          ],

          where,

          _count: {
            _all: true,
          },

          orderBy: {
            createdAt: "desc",
          },

          skip,
          take: limit,
        });

      const batchCount =
        await prisma.notification.groupBy({
          by: ["batchId"],
          where,
        });

      const total =
        batchCount.length;

      const totalPages = Math.max(
        Math.ceil(total / limit),
        1
      );

      const history =
  await Promise.all(
    grouped.map(async (item) => {

          const readCount =
  await prisma.notification.count({
    where: {
      batchId: item.batchId,
      isRead: true,
    },
  });

          return {
            id: item.batchId,
            batchId: item.batchId,

            title: item.title,
            message: item.message,

            type: item.type,
            priority: item.priority,
            audience: item.audience,
            targetRole:
              item.targetRole,

            actionText:
              item.actionText,
            actionUrl:
              item.actionUrl,
            imageUrl:
              item.imageUrl,

            createdById:
              item.createdById,
            createdByName:
              item.createdByName,
            createdByEmail:
              item.createdByEmail,

            recipientCount,
            totalRecipients:
              recipientCount,

            deliveredCount:
              recipientCount,

            readCount,

            unreadCount:
              recipientCount -
              readCount,

            readRate:
              calculatePercentage(
                readCount,
                recipientCount
              ),

            status: "SENT",

            createdAt:
              item.createdAt,
            sentAt:
              item.createdAt,
          };
            })
  );

      return res.status(200).json({
        success: true,

        message:
          "Notification history retrieved successfully.",

        notifications: history,
        history,

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
   GET SINGLE NOTIFICATION BATCH

   GET /api/v1/admin/notifications/:id
====================================================== */

exports.getNotificationById =
  async (req, res) => {
    try {
      const id = normalizeText(
        req.params.id
      );

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Notification ID is required.",
        });
      }

      let notification =
        await prisma.notification.findUnique({
          where: {
            id,
          },
        });

      let batchId = id;

      if (notification) {
        batchId =
          notification.batchId;
      }

      const notifications =
        await prisma.notification.findMany({
          where: {
            batchId,
          },

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
        });

      if (
        notifications.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Notification was not found.",
        });
      }

      const first =
        notifications[0];

      const readCount =
        notifications.filter(
          (item) => item.isRead
        ).length;

      const recipientCount =
        notifications.length;

      return res.status(200).json({
        success: true,

        message:
          "Notification retrieved successfully.",

        notification: {
          id: first.batchId,
          batchId: first.batchId,

          title: first.title,
          message: first.message,

          type: first.type,
          priority:
            first.priority,
          audience:
            first.audience,
          targetRole:
            first.targetRole,

          actionText:
            first.actionText,
          actionUrl:
            first.actionUrl,
          imageUrl:
            first.imageUrl,

          createdById:
            first.createdById,
          createdByName:
            first.createdByName,
          createdByEmail:
            first.createdByEmail,

          createdAt:
            first.createdAt,
          sentAt:
            first.createdAt,

          recipients:
            notifications.map(
              serializeNotification
            ),
        },

        analytics: {
          totalRecipients:
            recipientCount,

          delivered:
            recipientCount,

          read: readCount,

          unread:
            recipientCount -
            readCount,

          failed: 0,

          deliveryRate: 100,

          readRate:
            calculatePercentage(
              readCount,
              recipientCount
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
        allBatches,
        sentTodayBatches,
        totalRecipients,
        totalRead,
        typeGroups,
        audienceGroups,
      ] = await Promise.all([
        prisma.notification.groupBy({
          by: ["batchId"],
        }),

        prisma.notification.groupBy({
          by: ["batchId"],

          where: {
            createdAt: {
              gte: today,
            },
          },
        }),

        prisma.notification.count(),

        prisma.notification.count({
          where: {
            isRead: true,
          },
        }),

        prisma.notification.groupBy({
          by: ["type"],

          _count: {
            _all: true,
          },
        }),

        prisma.notification.groupBy({
          by: ["audience"],

          _count: {
            _all: true,
          },
        }),
      ]);

      const totalNotifications =
        allBatches.length;

      const sentToday =
        sentTodayBatches.length;

      const unread =
        totalRecipients -
        totalRead;

      return res.status(200).json({
        success: true,

        message:
          "Notification statistics retrieved successfully.",

        statistics: {
          totalNotifications,

          sentNotifications:
            totalNotifications,

          scheduledNotifications: 0,
          failedNotifications: 0,

          sentToday,

          totalRecipients,

          delivered:
            totalRecipients,

          read: totalRead,

          unread,

          clicked: 0,
          failed: 0,

          deliveryRate:
            totalRecipients > 0
              ? 100
              : 0,

          readRate:
            calculatePercentage(
              totalRead,
              totalRecipients
            ),

          clickRate: 0,
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

        audienceBreakdown:
          audienceGroups.reduce(
            (result, item) => {
              result[item.audience] =
                item._count._all;

              return result;
            },
            {}
          ),

        statusBreakdown: {
          SENT:
            totalNotifications,
          SCHEDULED: 0,
          FAILED: 0,
        },
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
   DELETE WHOLE NOTIFICATION BATCH

   DELETE /api/v1/admin/notifications/:id
====================================================== */

exports.deleteNotification = async (
  req,
  res
) => {
  try {
    const id = normalizeText(
      req.params.id
    );

    let notification =
      await prisma.notification.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          batchId: true,
          title: true,
        },
      });

    let batchId = id;
    let title = "Notification";

    if (notification) {
      batchId =
        notification.batchId;

      title =
        notification.title;
    } else {
      const batchNotification =
        await prisma.notification.findFirst({
          where: {
            batchId: id,
          },

          select: {
            batchId: true,
            title: true,
          },
        });

      if (!batchNotification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification was not found.",
        });
      }

      batchId =
        batchNotification.batchId;

      title =
        batchNotification.title;
    }

    const result =
      await prisma.notification.deleteMany({
        where: {
          batchId,
        },
      });

    await writeAuditLog({
      req,
      action:
        "DELETE_NOTIFICATION",
      description:
        `${req.user?.email || "Admin"} deleted notification "${title}" for ${result.count} recipient(s).`,
    });

    publishEvent(
      "notification-deleted",
      {
        batchId,
      }
    );

    return res.status(200).json({
      success: true,

      message:
        "Notification deleted successfully.",

      deletedCount:
        result.count,
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
   SEARCH USERS

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

      if (
        search.length < 2
      ) {
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
            status: true,
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

/* ======================================================
   SIMPLE SYSTEM DOES NOT SUPPORT SCHEDULING YET

   Ana bar waɗannan exports saboda routes ɗinka
   kada su kawo "handler must be a function".
====================================================== */

exports.processScheduledNotifications =
  async (req, res) => {
    return res.status(200).json({
      success: true,
      message:
        "Scheduled notifications are not enabled in the simple notification system.",
      processed: 0,
      results: [],
    });
  };

exports.cancelNotification =
  async (req, res) => {
    return res.status(400).json({
      success: false,
      message:
        "Scheduled notifications are not enabled. Sent notifications can only be deleted.",
    });
  };