const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const {
  validate,
  createServiceSchema,
  updateServiceSchema,
  statusSchema,
} = require("./api-service.validator");

const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  changeStatus,
  statistics,
} = require("./api-service.controller");

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
  getServices
);

router.get(
  "/:id",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getService
);

router.post(
  "/",
  auth,
  role("SUPER_ADMIN"),
  validate(createServiceSchema),
  createService
);

router.patch(
  "/:id",
  auth,
  role("SUPER_ADMIN"),
  validate(updateServiceSchema),
  updateService
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
  deleteService
);

module.exports = router;