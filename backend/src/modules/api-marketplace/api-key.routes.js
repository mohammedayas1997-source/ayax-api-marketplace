const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const {
  validate,
  createKeySchema,
  regenerateKeySchema,
  statusSchema,
} = require("./api-key.validator");

const {
  getKeys,
  getKey,
  createKey,
  regenerateKey,
  changeStatus,
  deleteKey,
  statistics,
} = require("./api-key.controller");

router.get(
  "/statistics",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  statistics
);

router.get(
  "/",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getKeys
);

router.get(
  "/:id",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getKey
);

router.post(
  "/",
  auth,
  role("SUPER_ADMIN"),
  validate(createKeySchema),
  createKey
);

router.patch(
  "/:id/regenerate",
  auth,
  role("SUPER_ADMIN"),
  validate(regenerateKeySchema),
  regenerateKey
);

router.patch(
  "/:id/status",
  auth,
  role("SUPER_ADMIN"),
  validate(statusSchema),
  changeStatus
);

router.delete(
  "/:id",
  auth,
  role("SUPER_ADMIN"),
  deleteKey
);

module.exports = router;