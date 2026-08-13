const userService = require("./user.service");
const createAuditLog = require("../../utils/audit");
const { emitEvent } = require("../../config/socket");

/* ======================================================
   HELPERS
====================================================== */

const removePassword = (user) => {
  if (!user || typeof user !== "object") {
    return user;
  }

  const {
    password,
    failedLoginAttempts,
    lockedUntil,
    passwordChangedAt,
    ...safeUser
  } = user;

  return safeUser;
};

const normalizeUsersResult = (result) => {
  if (Array.isArray(result)) {
    return {
      users: result,
      pagination: null,
    };
  }

  if (
    result &&
    Array.isArray(result.users)
  ) {
    return {
      users: result.users,
      pagination:
        result.pagination || null,
    };
  }

  if (
    result?.data &&
    Array.isArray(result.data)
  ) {
    return {
      users: result.data,
      pagination:
        result.pagination || null,
    };
  }

  if (
    result?.data &&
    Array.isArray(result.data.users)
  ) {
    return {
      users: result.data.users,
      pagination:
        result.data.pagination ||
        result.pagination ||
        null,
    };
  }

  return {
    users: [],
    pagination:
      result?.pagination || null,
  };
};

const getClientIp = (req) => {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (
    typeof forwarded === "string" &&
    forwarded.trim()
  ) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return req.ip || null;
};

const sendError = (
  res,
  error,
  fallbackMessage,
  statusCode = 500
) => {
  console.error(
    fallbackMessage,
    error
  );

  return res.status(
    Number(error?.statusCode) ||
      statusCode
  ).json({
    success: false,
    message:
      error?.message ||
      fallbackMessage,
  });
};

/* ======================================================
   GET USERS
====================================================== */

exports.getUsers = async (
  req,
  res
) => {
  try {
    const result =
      await userService.getUsers(
        req.query
      );

    const {
      users,
      pagination,
    } = normalizeUsersResult(result);

    const safeUsers =
      users.map(removePassword);

    return res.status(200).json({
      success: true,
      message:
        "Users retrieved successfully.",

      users: safeUsers,

      data: safeUsers,

      pagination,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to retrieve users."
    );
  }
};

/* ======================================================
   GET SINGLE USER
====================================================== */

exports.getUser = async (
  req,
  res
) => {
  try {
    const user =
      await userService.getUserById(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "User retrieved successfully.",
      user:
        removePassword(user),
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to retrieve user."
    );
  }
};

/* ======================================================
   CREATE USER
====================================================== */

exports.createUser = async (
  req,
  res
) => {
  try {
    const user =
      await userService.createUser(
        req.body
      );

    await createAuditLog({
      user: req.user,
      action: "CREATE_USER",
      module: "USERS",
      description:
        `${req.user.email} created user ${user.email}`,
      ip: getClientIp(req),
    });

    const safeUser =
      removePassword(user);

    emitEvent("user-created", {
      message:
        "User created",
      user: safeUser,
    });

    return res.status(201).json({
      success: true,
      message:
        "User created successfully.",
      user: safeUser,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to create user.",
      400
    );
  }
};

/* ======================================================
   UPDATE USER
====================================================== */

exports.updateUser = async (
  req,
  res
) => {
  try {
    const user =
      await userService.updateUser(
        req.params.id,
        req.body
      );

    await createAuditLog({
      user: req.user,
      action: "UPDATE_USER",
      module: "USERS",
      description:
        `${req.user.email} updated user ${user.email}`,
      ip: getClientIp(req),
    });

    const safeUser =
      removePassword(user);

    emitEvent("user-updated", {
      message:
        "User updated",
      user: safeUser,
    });

    return res.status(200).json({
      success: true,
      message:
        "User updated successfully.",
      user: safeUser,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to update user.",
      400
    );
  }
};

/* ======================================================
   CHANGE ROLE
====================================================== */

exports.changeRole = async (
  req,
  res
) => {
  try {
    const user =
      await userService.changeUserRole(
        req.params.id,
        req.body.role
      );

    await createAuditLog({
      user: req.user,
      action:
        "CHANGE_USER_ROLE",
      module: "USERS",
      description:
        `${req.user.email} changed ${user.email} role to ${user.role}`,
      ip: getClientIp(req),
    });

    const safeUser =
      removePassword(user);

    emitEvent(
      "user-role-changed",
      {
        message:
          "User role changed",
        user: safeUser,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "User role updated successfully.",
      user: safeUser,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to change user role.",
      400
    );
  }
};

/* ======================================================
   CHANGE STATUS
====================================================== */

exports.changeStatus = async (
  req,
  res
) => {
  try {
    const user =
      await userService.changeUserStatus(
        req.params.id,
        req.body.status
      );

    await createAuditLog({
      user: req.user,
      action:
        "CHANGE_USER_STATUS",
      module: "USERS",
      description:
        `${req.user.email} changed ${user.email} status to ${user.status}`,
      ip: getClientIp(req),
    });

    const safeUser =
      removePassword(user);

    emitEvent(
      "user-status-changed",
      {
        message:
          "User status changed",
        user: safeUser,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "User status updated successfully.",
      user: safeUser,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to change user status.",
      400
    );
  }
};

/* ======================================================
   DELETE USER
====================================================== */

exports.deleteUser = async (
  req,
  res
) => {
  try {
    const user =
      await userService.deleteUser(
        req.params.id
      );

    await createAuditLog({
      user: req.user,
      action: "DELETE_USER",
      module: "USERS",
      description:
        `${req.user.email} deleted user ${user.email}`,
      ip: getClientIp(req),
    });

    emitEvent("user-deleted", {
      message:
        "User deleted",
      userId:
        req.params.id,
    });

    return res.status(200).json({
      success: true,
      message:
        "User deleted successfully.",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to delete user.",
      400
    );
  }
};