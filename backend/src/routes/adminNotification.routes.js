const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  sendNotification,
  getNotificationHistory,
  getNotificationById,
  getNotificationStatistics,
  processScheduledNotifications,
  cancelNotification,
  deleteNotification,
  searchNotificationUsers,
} = require("../controllers/adminNotification.controller");

// Duk routes suna buƙatar login
router.use(auth);

// ===== Dashboard =====
router.get(
  "/statistics",
  role("SUPER_ADMIN", "ADMIN"),
  getNotificationStatistics
);

// ===== History =====
router.get(
  "/history",
  role("SUPER_ADMIN", "ADMIN"),
  getNotificationHistory
);

// ===== Search Users =====
router.get(
  "/users/search",
  role("SUPER_ADMIN", "ADMIN"),
  searchNotificationUsers
);

// ===== Send =====
router.post(
  "/send",
  role("SUPER_ADMIN", "ADMIN"),
  sendNotification
);

// ===== Process Scheduled =====
router.post(
  "/process",
  role("SUPER_ADMIN"),
  processScheduledNotifications
);

// ===== Single Notification =====
router.get(
  "/:id",
  role("SUPER_ADMIN", "ADMIN"),
  getNotificationById
);

// ===== Cancel =====
router.patch(
  "/:id/cancel",
  role("SUPER_ADMIN"),
  cancelNotification
);

// ===== Delete =====
router.delete(
  "/:id",
  role("SUPER_ADMIN"),
  deleteNotification
);

module.exports = router;