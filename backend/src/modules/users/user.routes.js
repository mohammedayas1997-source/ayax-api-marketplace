const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const {
  validate,
  createUserSchema,
  updateUserSchema,
  roleSchema,
  statusSchema,
} = require("./user.validator");

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changeRole,
  changeStatus,
} = require("./user.controller");

router.get(
  "/",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getUsers
);

router.get(
  "/:id",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getUser
);

router.post(
  "/",
  auth,
  role("SUPER_ADMIN"),
  validate(createUserSchema),
  createUser
);

router.patch(
  "/:id",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  validate(updateUserSchema),
  updateUser
);

router.patch(
  "/:id/role",
  auth,
  role("SUPER_ADMIN"),
  validate(roleSchema),
  changeRole
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
  deleteUser
);

module.exports = router;