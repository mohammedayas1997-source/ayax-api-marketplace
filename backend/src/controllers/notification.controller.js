const prisma = require("../config/prisma");

const ALLOWED_FILTERS = [
  "ALL",
  "UNREAD",
  "READ",
];

const serializeNotification = (
  notification
) => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  status: notification.status,
  actionUrl: notification.actionUrl,
  createdAt: notification.createdAt,
  readAt: notification.readAt,
  isRead:
    notification.status === "READ",
});

exports.getNotifications = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 50,
        1
      ),
      100
    );

    const skip =
      (page - 1) * limit;

    const filter = String(
      req.query.status ||
      req.query.filter ||
      "ALL"
    )
      .trim()
      .toUpperCase();

    if (
      !ALLOWED_FILTERS.includes(filter)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Filter must be ALL, UNREAD or READ.",
      });
    }

    const where = {
      userId,
    };

    if (filter !== "ALL") {
      where.status = filter;
    }

    const [
      notifications,
      total,
      unreadCount,
      readCount,
    ] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.notification.count({
        where,
      }),

      prisma.notification.count({
        where: {
          userId,
          status: "UNREAD",
        },
      }),

      prisma.notification.count({
        where: {
          userId,
          status: "READ",
        },
      }),
    ]);

    const totalPages = Math.max(
      Math.ceil(total / limit),
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
      summary: {
        total:
          unreadCount + readCount,
        unread: unreadCount,
        read: readCount,
      },
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
    console.error(
      "Get notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve notifications.",
    });
  }
};

exports.markAsRead = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const notificationId =
      req.params.id;

    const notification =
      await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
        },
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found.",
      });
    }

    const updatedNotification =
      await prisma.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          status: "READ",
          readAt:
            notification.readAt ||
            new Date(),
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Notification marked as read.",
      notification:
        serializeNotification(
          updatedNotification
        ),
    });
  } catch (error) {
    console.error(
      "Mark notification as read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to mark notification as read.",
    });
  }
};

exports.markAllAsRead = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const readAt = new Date();

    const result =
      await prisma.notification.updateMany({
        where: {
          userId,
          status: "UNREAD",
        },
        data: {
          status: "READ",
          readAt,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "All notifications marked as read.",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error(
      "Mark all notifications as read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to mark all notifications as read.",
    });
  }
};

exports.deleteNotification = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const notificationId =
      req.params.id;

    const notification =
      await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
        },
        select: {
          id: true,
        },
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found.",
      });
    }

    await prisma.notification.delete({
      where: {
        id: notification.id,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Notification deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete notification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete notification.",
    });
  }
};

exports.deleteAllNotifications =
  async (req, res) => {
    try {
      const userId = req.user.id;

      const result =
        await prisma.notification.deleteMany({
          where: {
            userId,
          },
        });

      return res.status(200).json({
        success: true,
        message:
          "All notifications deleted successfully.",
        deletedCount:
          result.count,
      });
    } catch (error) {
      console.error(
        "Delete all notifications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete notifications.",
      });
    }
  };