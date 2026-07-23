const express = require("express");

const router = express.Router();

const auth = require(
  "../middlewares/auth.middleware"
);

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} = require(
  "../controllers/notification.controller"
);

router.use(auth);

router.get(
  "/",
  getNotifications
);

router.patch(
  "/read-all",
  markAllAsRead
);

router.patch(
  "/:id/read",
  markAsRead
);

router.delete(
  "/all",
  deleteAllNotifications
);

router.delete(
  "/:id",
  deleteNotification
);

module.exports = router;