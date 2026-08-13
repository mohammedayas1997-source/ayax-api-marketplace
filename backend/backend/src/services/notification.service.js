const crypto = require("crypto");
const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

/**
 * ============================================
 * Helpers
 * ============================================
 */

const generateBatchId = () => {
  return crypto.randomUUID();
};

const normalizeType = (type) => {
  const allowedTypes = [
    "INFO",
    "SUCCESS",
    "WARNING",
    "ERROR",
    "UPDATE",
    "PROMOTION",
    "SYSTEM",
  ];

  const normalizedType = String(type || "INFO").toUpperCase();

  return allowedTypes.includes(normalizedType)
    ? normalizedType
    : "INFO";
};

const normalizePriority = (priority) => {
  const allowedPriorities = [
    "LOW",
    "NORMAL",
    "HIGH",
    "CRITICAL",
  ];

  const normalizedPriority = String(
    priority || "NORMAL"
  ).toUpperCase();

  return allowedPriorities.includes(normalizedPriority)
    ? normalizedPriority
    : "NORMAL";
};

const emitUserNotification = (
  userId,
  notification
) => {
  try {
    emitEvent(
      "notification",
      notification,
      `user-${userId}`
    );

    emitEvent(
      "notification:new",
      {
        userId,
        notification,
      },
      `user-${userId}`
    );
  } catch (error) {
    console.error(
      "Notification socket emission error:",
      error
    );
  }
};

/**
 * ============================================
 * Create In-App Notification
 * ============================================
 */

exports.createNotification = async ({
  userId,
  batchId = null,

  title,
  message,

  type = "INFO",
  priority = "NORMAL",
  audience = "USER",

  targetRole = null,

  actionText = null,
  actionUrl = null,
  imageUrl = null,

  createdById = null,
  createdByName = "Ayax System",
  createdByEmail = "system@ayaxdigital.solutions",
}) => {
  if (!userId) {
    throw new Error(
      "User ID is required to create a notification."
    );
  }

  if (!title || !String(title).trim()) {
    throw new Error(
      "Notification title is required."
    );
  }

  if (!message || !String(message).trim()) {
    throw new Error(
      "Notification message is required."
    );
  }

  const notification =
    await prisma.notification.create({
      data: {
        batchId:
          batchId || generateBatchId(),

        userId,

        title: String(title).trim(),
        message: String(message).trim(),

        type: normalizeType(type),
        priority:
          normalizePriority(priority),

        audience: String(
          audience || "USER"
        ).toUpperCase(),

        targetRole,

        actionText:
          actionText?.trim() || null,

        actionUrl:
          actionUrl?.trim() || null,

        imageUrl:
          imageUrl?.trim() || null,

        isRead: false,

        createdById,
        createdByName,
        createdByEmail,
      },
    });

  emitUserNotification(
    userId,
    notification
  );

  return notification;
};

/**
 * ============================================
 * Create Notification Without Breaking
 * Main Operation
 * ============================================
 */

exports.createNotificationSafely = async (
  notificationData
) => {
  try {
    return await exports.createNotification(
      notificationData
    );
  } catch (error) {
    console.error(
      "Unable to create notification:",
      error
    );

    return null;
  }
};

/**
 * ============================================
 * Welcome Notification
 * ============================================
 */

exports.sendWelcomeNotification = async (
  user
) => {
  if (!user?.id) {
    return null;
  }

  return exports.createNotificationSafely({
    userId: user.id,

    title: "Welcome to Ayax APIs",

    message: `Hello ${user.name || "Developer"},

Welcome to Ayax APIs Developer Marketplace. Your account has been created successfully.

You can now fund your wallet, manage your API keys, access developer services and track all your transactions.`,

    type: "SUCCESS",
    priority: "NORMAL",
    audience: "USER",

    actionText: "Open Dashboard",
    actionUrl: "/dashboard",

    createdByName: "Ayax System",
    createdByEmail:
      "system@ayaxdigital.solutions",
  });
};

/**
 * ============================================
 * Wallet Funded Notification
 * ============================================
 */

exports.sendWalletFundedNotification =
  async ({
    user,
    amount,
    balance,
    reference = null,
  }) => {
    if (!user?.id) {
      return null;
    }

    const formattedAmount = Number(
      amount || 0
    ).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const formattedBalance = Number(
      balance || 0
    ).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const referenceText = reference
      ? `

Transaction reference: ${reference}`
      : "";

    return exports.createNotificationSafely({
      userId: user.id,

      title:
        "Wallet Funded Successfully",

      message: `Hello ${user.name || "Developer"},

Your Ayax APIs wallet has been credited successfully with ₦${formattedAmount}.

Your new wallet balance is ₦${formattedBalance}.${referenceText}`,

      type: "SUCCESS",
      priority: "HIGH",
      audience: "USER",

      actionText: "View Wallet",
      actionUrl: "/dashboard/wallet",

      createdByName: "Ayax System",
      createdByEmail:
        "system@ayaxdigital.solutions",
    });
  };

/**
 * ============================================
 * Wallet Funding Failed Notification
 * ============================================
 */

exports.sendWalletFundingFailedNotification =
  async ({
    user,
    amount,
    reference = null,
    reason = null,
  }) => {
    if (!user?.id) {
      return null;
    }

    const formattedAmount = Number(
      amount || 0
    ).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return exports.createNotificationSafely({
      userId: user.id,

      title: "Wallet Funding Failed",

      message: `Hello ${user.name || "Developer"},

Your wallet funding request of ₦${formattedAmount} could not be completed.

${
  reason
    ? `Reason: ${reason}`
    : "Please try again or contact support if the issue continues."
}

${
  reference
    ? `Transaction reference: ${reference}`
    : ""
}`.trim(),

      type: "ERROR",
      priority: "HIGH",
      audience: "USER",

      actionText: "Try Again",
      actionUrl: "/dashboard/wallet",

      createdByName: "Ayax System",
      createdByEmail:
        "system@ayaxdigital.solutions",
    });
  };

/**
 * ============================================
 * Send Email
 * ============================================
 */

exports.sendEmail = async ({
  to,
  subject,
  body,
}) => {
  if (!to || !subject) {
    throw new Error(
      "Email recipient and subject are required."
    );
  }

  const email =
    await prisma.emailLog.create({
      data: {
        to: String(to).trim(),
        subject: String(subject).trim(),
        body: body
          ? String(body)
          : null,
        status: "PENDING",
      },
    });

  // TODO:
  // Nodemailer
  // Resend
  // SendGrid
  // Amazon SES

  return email;
};

/**
 * ============================================
 * Send SMS
 * ============================================
 */

exports.sendSMS = async ({
  phone,
  message,
}) => {
  if (!phone || !message) {
    throw new Error(
      "Phone number and message are required."
    );
  }

  const sms =
    await prisma.smsLog.create({
      data: {
        phone: String(phone).trim(),
        message: String(message).trim(),
        status: "PENDING",
      },
    });

  // TODO:
  // Termii
  // Twilio
  // Infobip

  return sms;
};

/**
 * ============================================
 * Broadcast Notification
 * ============================================
 */

exports.broadcast = async ({
  title,
  message,

  type = "INFO",
  priority = "NORMAL",

  targetRole = null,

  actionText = null,
  actionUrl = null,
  imageUrl = null,

  createdById = null,
  createdByName = "Ayax System",
  createdByEmail =
    "system@ayaxdigital.solutions",
}) => {
  if (!title || !message) {
    throw new Error(
      "Broadcast title and message are required."
    );
  }

  const where = {
    status: "ACTIVE",
  };

  if (targetRole) {
    where.role = targetRole;
  }

  const users =
    await prisma.user.findMany({
      where,
      select: {
        id: true,
      },
    });

  if (users.length === 0) {
    return {
      success: true,
      batchId: null,
      recipientCount: 0,
    };
  }

  const batchId =
    generateBatchId();

  const audience = targetRole
    ? "ROLE"
    : "ALL";

  await prisma.notification.createMany({
    data: users.map((user) => ({
      batchId,

      userId: user.id,

      title: String(title).trim(),
      message: String(message).trim(),

      type: normalizeType(type),
      priority:
        normalizePriority(priority),

      audience,
      targetRole:
        targetRole || null,

      actionText:
        actionText?.trim() || null,

      actionUrl:
        actionUrl?.trim() || null,

      imageUrl:
        imageUrl?.trim() || null,

      isRead: false,

      createdById,
      createdByName,
      createdByEmail,
    })),
  });

  emitEvent("broadcast", {
    batchId,
    title,
    message,
    type: normalizeType(type),
    priority:
      normalizePriority(priority),
    audience,
    targetRole,
    recipientCount: users.length,
  });

  emitEvent(
    "notification-broadcast-created",
    {
      batchId,
      recipientCount: users.length,
    }
  );

  return {
    success: true,
    batchId,
    recipientCount: users.length,
  };
};

/**
 * ============================================
 * Mark One Notification as Read
 * ============================================
 */

exports.markAsRead = async (
  id,
  userId = null
) => {
  if (!id) {
    throw new Error(
      "Notification ID is required."
    );
  }

  const where = userId
    ? {
        id,
        userId,
      }
    : {
        id,
      };

  const notification =
    await prisma.notification.findFirst({
      where,
    });

  if (!notification) {
    throw new Error(
      "Notification not found."
    );
  }

  return prisma.notification.update({
    where: {
      id: notification.id,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

/**
 * ============================================
 * Mark All User Notifications as Read
 * ============================================
 */

exports.markAllAsRead = async (
  userId
) => {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

/**
 * ============================================
 * Get User Notifications
 * ============================================
 */

exports.getUserNotifications = async (
  userId,
  {
    page = 1,
    limit = 20,
    unreadOnly = false,
  } = {}
) => {
  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const where = {
    userId,
  };

  if (unreadOnly) {
    where.isRead = false;
  }

  const [
    notifications,
    total,
    unread,
  ] = await Promise.all([
    prisma.notification.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      skip:
        (safePage - 1) *
        safeLimit,

      take: safeLimit,
    }),

    prisma.notification.count({
      where,
    }),

    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
  ]);

  return {
    notifications,

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages:
        Math.max(
          Math.ceil(
            total / safeLimit
          ),
          1
        ),
    },

    unreadCount: unread,
  };
};

/**
 * ============================================
 * Delete User Notification
 * ============================================
 */

exports.deleteNotification = async (
  id,
  userId = null
) => {
  const notification =
    await prisma.notification.findFirst({
      where: {
        id,
        ...(userId
          ? {
              userId,
            }
          : {}),
      },
    });

  if (!notification) {
    throw new Error(
      "Notification not found."
    );
  }

  await prisma.notification.delete({
    where: {
      id: notification.id,
    },
  });

  emitEvent(
    "notification-deleted",
    {
      notificationId:
        notification.id,

      batchId:
        notification.batchId,

      userId:
        notification.userId,
    },
    `user-${notification.userId}`
  );

  return notification;
};

/**
 * ============================================
 * Notification Statistics
 * ============================================
 */

exports.statistics = async (
  userId = null
) => {
  const baseWhere = userId
    ? {
        userId,
      }
    : {};

  const [
    total,
    unread,
    read,
  ] = await Promise.all([
    prisma.notification.count({
      where: baseWhere,
    }),

    prisma.notification.count({
      where: {
        ...baseWhere,
        isRead: false,
      },
    }),

    prisma.notification.count({
      where: {
        ...baseWhere,
        isRead: true,
      },
    }),
  ]);

  const readRate =
    total > 0
      ? Number(
          (
            (read / total) *
            100
          ).toFixed(1)
        )
      : 0;

  return {
    total,
    unread,
    read,
    readRate,
  };
};