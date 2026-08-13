const express = require("express");

const router = express.Router();

const auth = require(
  "../middlewares/auth.middleware"
);

const {
  getMyNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteMyNotification,
} = require(
  "../controllers/notification.controller"
);

router.use(auth);

router.get(
  "/",
  getMyNotifications
);

router.get(
  "/unread-count",
  getUnreadCount
);

router.patch(
  "/read-all",
  markAllAsRead
);

router.get(
  "/:id",
  getNotificationById
);

router.patch(
  "/:id/read",
  markAsRead
);

router.delete(
  "/:id",
  deleteMyNotification
);

module.exports = router;