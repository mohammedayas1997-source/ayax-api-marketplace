const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const controller = require("./webhook.controller");

router.get(
  "/statistics",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  controller.statistics
);

router.get(
  "/",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  controller.getWebhooks
);

router.get(
  "/:id",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  controller.getWebhook
);

router.post(
  "/",
  auth,
  role("SUPER_ADMIN"),
  controller.createWebhook
);

router.patch(
  "/:id",
  auth,
  role("SUPER_ADMIN"),
  controller.updateWebhook
);

router.delete(
  "/:id",
  auth,
  role("SUPER_ADMIN"),
  controller.deleteWebhook
);

module.exports = router;