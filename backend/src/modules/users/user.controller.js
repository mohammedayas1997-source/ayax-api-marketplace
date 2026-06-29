const userService = require("./user.service");
const createAuditLog = require("../../utils/audit");
const { emitEvent } = require("../../config/socket");

const removePassword = (user) => {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return safeUser;
};

exports.getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers(req.query);

    return res.json({
      success: true,
      users: users.map(removePassword),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: removePassword(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);

    await createAuditLog({
      user: req.user,
      action: "CREATE_USER",
      module: "USERS",
      description: `${req.user.email} created user ${user.email}`,
      ip: req.ip,
    });

    emitEvent("user-created", {
      message: "User created",
      user: removePassword(user),
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: removePassword(user),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);

    await createAuditLog({
      user: req.user,
      action: "UPDATE_USER",
      module: "USERS",
      description: `${req.user.email} updated user ${user.email}`,
      ip: req.ip,
    });

    emitEvent("user-updated", {
      message: "User updated",
      user: removePassword(user),
    });

    return res.json({
      success: true,
      message: "User updated successfully",
      user: removePassword(user),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.changeRole = async (req, res) => {
  try {
    const user = await userService.changeUserRole(
      req.params.id,
      req.body.role
    );

    await createAuditLog({
      user: req.user,
      action: "CHANGE_USER_ROLE",
      module: "USERS",
      description: `${req.user.email} changed ${user.email} role to ${user.role}`,
      ip: req.ip,
    });

    emitEvent("user-role-changed", {
      message: "User role changed",
      user: removePassword(user),
    });

    return res.json({
      success: true,
      message: "User role updated successfully",
      user: removePassword(user),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.changeStatus = async (req, res) => {
  try {
    const user = await userService.changeUserStatus(
      req.params.id,
      req.body.status
    );

    await createAuditLog({
      user: req.user,
      action: "CHANGE_USER_STATUS",
      module: "USERS",
      description: `${req.user.email} changed ${user.email} status to ${user.status}`,
      ip: req.ip,
    });

    emitEvent("user-status-changed", {
      message: "User status changed",
      user: removePassword(user),
    });

    return res.json({
      success: true,
      message: "User status updated successfully",
      user: removePassword(user),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await userService.deleteUser(req.params.id);

    await createAuditLog({
      user: req.user,
      action: "DELETE_USER",
      module: "USERS",
      description: `${req.user.email} deleted user ${user.email}`,
      ip: req.ip,
    });

    emitEvent("user-deleted", {
      message: "User deleted",
      userId: req.params.id,
    });

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};