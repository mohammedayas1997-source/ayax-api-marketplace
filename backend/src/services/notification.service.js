const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

/**
 * ============================================
 * Create In-App Notification
 * ============================================
 */
exports.createNotification = async ({
  userId,
  title,
  message,
  type = "INFO",
  actionUrl = null,
}) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      actionUrl,
    },
  });

  emitEvent("notification", notification, `user-${userId}`);

  return notification;
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
  const email = await prisma.emailLog.create({
    data: {
      to,
      subject,
      body,
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
  const sms = await prisma.smsLog.create({
    data: {
      phone,
      message,
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
}) => {

  const users = await prisma.user.findMany({
    select: {
      id: true,
    },
  });

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      title,
      message,
      type,
    })),
  });

  emitEvent("broadcast", {
    title,
    message,
    type,
  });

  return true;
};

/**
 * ============================================
 * Mark Notification Read
 * ============================================
 */
exports.markAsRead = async (id) => {
  return prisma.notification.update({
    where: {
      id,
    },
    data: {
      status: "READ",
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
  userId
) => {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * ============================================
 * Notification Statistics
 * ============================================
 */
exports.statistics = async () => {

  const [
    total,
    unread,
    read,
  ] = await Promise.all([

    prisma.notification.count(),

    prisma.notification.count({
      where: {
        status: "UNREAD",
      },
    }),

    prisma.notification.count({
      where: {
        status: "READ",
      },
    }),

  ]);

  return {
    total,
    unread,
    read,
  };
};