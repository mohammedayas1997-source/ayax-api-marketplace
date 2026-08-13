const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

/* ======================================================
   HELPERS
====================================================== */

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

const serializeNotification = (
  notification
) => ({
  id: notification.id,
  batchId: notification.batchId,

  title: notification.title,
  message: notification.message,

  type: notification.type,
  priority: notification.priority,
  audience: notification.audience,
  targetRole: notification.targetRole,

  actionText: notification.actionText,
  actionUrl: notification.actionUrl,
  imageUrl: notification.imageUrl,

  isRead: notification.isRead,
  readAt: notification.readAt,

  createdByName:
    notification.createdByName,
  createdByEmail:
    notification.createdByEmail,

  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
});

const sendError = (
  res,
  error,
  fallbackMessage
) => {
  console.error(
    fallbackMessage,
    error
  );

  return res.status(500).json({
    success: false,
    message:
      error?.message ||
      fallbackMessage,
  });
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
      emitEvent(eventName, payload);
    }
  } catch (error) {
    console.error(
      `Socket event error (${eventName}):`,
      error.message
    );
  }
};

/* ======================================================
   GET MY NOTIFICATIONS

   GET /api/v1/notifications
====================================================== */

exports.getMyNotifications = async (
  req,
  res
) => {
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

    const filter = String(
      req.query.filter || "ALL"
    ).toUpperCase();

    const where = {
      userId,
    };

    if (filter === "UNREAD") {
      where.isRead = false;
    }

    if (filter === "READ") {
      where.isRead = true;
    }

    if (
      !["ALL", "UNREAD", "READ"].includes(
        filter
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification filter.",
      });
    }

    const [
      notifications,
      total,
      unread,
      read,
    ] = await Promise.all([
      prisma.notification.findMany({
        where,

        orderBy: [
          {
            createdAt: "desc",
          },
        ],

        skip,
        take: limit,
      }),

      prisma.notification.count({
        where: {
          userId,
        },
      }),

      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),

      prisma.notification.count({
        where: {
          userId,
          isRead: true,
        },
      }),
    ]);

    const filteredTotal =
      await prisma.notification.count({
        where,
      });

    const totalPages =
      Math.max(
        Math.ceil(
          filteredTotal / limit
        ),
        1
      );

    return res.status(200).json({
      success: true,

      message:
        "Notifications retrieved successfully.",

      notifications:
        notifications.map(
          serializeNotification
        ),

      data: notifications.map(
        serializeNotification
      ),

      summary: {
        total,
        unread,
        read,
      },

      counts: {
        total,
        unread,
        read,
      },

      pagination: {
        page,
        limit,
        total: filteredTotal,
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
      "Unable to retrieve notifications."
    );
  }
};

/* ======================================================
   GET UNREAD COUNT

   GET /api/v1/notifications/unread-count
====================================================== */

exports.getUnreadCount = async (
  req,
  res
) => {
  try {
    const unread =
      await prisma.notification.count({
        where: {
          userId: req.user.id,
          isRead: false,
        },
      });

    return res.status(200).json({
      success: true,
      unread,
      count: unread,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to retrieve unread count."
    );
  }
};

/* ======================================================
   GET SINGLE NOTIFICATION

   GET /api/v1/notifications/:id
====================================================== */

exports.getNotificationById = async (
  req,
  res
) => {
  try {
    const notification =
      await prisma.notification.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id,
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

      notification:
        serializeNotification(
          notification
        ),
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
   MARK ONE AS READ

   PATCH /api/v1/notifications/:id/read
====================================================== */

exports.markAsRead = async (
  req,
  res
) => {
  try {
    const existing =
      await prisma.notification.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message:
          "Notification was not found.",
      });
    }

    const notification =
      await prisma.notification.update({
        where: {
          id: existing.id,
        },

        data: {
          isRead: true,
          readAt:
            existing.readAt ||
            new Date(),
        },
      });

    publishEvent(
      "notification-read",
      {
        userId: req.user.id,
        notificationId:
          notification.id,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Notification marked as read.",

      notification:
        serializeNotification(
          notification
        ),
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to mark notification as read."
    );
  }
};

/* ======================================================
   MARK ALL AS READ

   PATCH /api/v1/notifications/read-all
====================================================== */

exports.markAllAsRead = async (
  req,
  res
) => {
  try {
    const now = new Date();

    const result =
      await prisma.notification.updateMany({
        where: {
          userId: req.user.id,
          isRead: false,
        },

        data: {
          isRead: true,
          readAt: now,
        },
      });

    publishEvent(
      "notifications-read-all",
      {
        userId: req.user.id,
        count: result.count,
      }
    );

    return res.status(200).json({
      success: true,

      message:
        "All notifications marked as read.",

      updatedCount:
        result.count,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to mark all notifications as read."
    );
  }
};

/* ======================================================
   DELETE MY NOTIFICATION

   DELETE /api/v1/notifications/:id
====================================================== */

exports.deleteMyNotification = async (
  req,
  res
) => {
  try {
    const existing =
      await prisma.notification.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message:
          "Notification was not found.",
      });
    }

    await prisma.notification.delete({
      where: {
        id: existing.id,
      },
    });

    publishEvent(
      "user-notification-deleted",
      {
        userId: req.user.id,
        notificationId:
          existing.id,
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