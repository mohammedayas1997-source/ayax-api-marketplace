const prisma = require("../config/prisma");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to load notifications",
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await prisma.notification.update({
      where: {
        id: req.params.id,
      },
      data: {
        isRead: true,
      },
    });

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};