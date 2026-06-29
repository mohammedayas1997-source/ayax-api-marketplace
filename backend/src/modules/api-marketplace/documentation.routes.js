const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const {
  getDocs,
  getDoc,
  createDoc,
  updateDoc,
  deleteDoc,
} = require("./documentation.controller");

router.get(
  "/",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getDocs
);

router.get(
  "/:id",
  auth,
  role("SUPER_ADMIN", "ADMIN"),
  getDoc
);

router.post(
  "/",
  auth,
  role("SUPER_ADMIN"),
  createDoc
);

router.patch(
  "/:id",
  auth,
  role("SUPER_ADMIN"),
  updateDoc
);

router.delete(
  "/:id",
  auth,
  role("SUPER_ADMIN"),
  deleteDoc
);

module.exports = router;