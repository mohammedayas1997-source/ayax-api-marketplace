const router = require("express").Router();

const auth = require("../middlewares/auth.middleware");

const {
  getNotifications,
  markAsRead,
} = require("../controllers/notification.controller");

router.get("/", auth, getNotifications);

router.patch(
  "/:id/read",
  auth,
  markAsRead
);

module.exports = router;