const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const {
  getProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  changeStatus,
  statistics,
} = require("./api-provider.controller");

const {
  validate,
  createProviderSchema,
  updateProviderSchema,
  statusSchema,
} = require("./api-provider.validator");

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
  getProviders
);

router.get(
  "/:id",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getProvider
);

router.post(
  "/",
  auth,
  role("SUPER_ADMIN"),
  validate(createProviderSchema),
  createProvider
);

router.patch(
  "/:id",
  auth,
  role("SUPER_ADMIN"),
  validate(updateProviderSchema),
  updateProvider
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
  deleteProvider
);

module.exports = router;