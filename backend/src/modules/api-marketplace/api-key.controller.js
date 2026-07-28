const crypto = require("crypto");

const keyService = require("./api-key.service");
const createAuditLog = require("../../utils/audit");
const { emitEvent } = require("../../config/socket");

/* ======================================================
   CONSTANTS
====================================================== */

const SUPER_ADMIN_PIN =
  process.env.SUPER_ADMIN_PIN;

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
];

const ALLOWED_STATUSES = [
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
];

/* ======================================================
   HELPERS
====================================================== */

const normalizeText = (value) =>
  String(value || "").trim();

const normalizeUppercase = (value) =>
  normalizeText(value).toUpperCase();

const getUserRole = (user) =>
  normalizeUppercase(user?.role);

const isAdmin = (user) =>
  ADMIN_ROLES.includes(
    getUserRole(user)
  );

const isSuperAdmin = (user) =>
  getUserRole(user) ===
  "SUPER_ADMIN";

const createHttpError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
};

const getErrorStatus = (
  error,
  fallback = 500
) => {
  if (
    Number.isInteger(
      error?.statusCode
    )
  ) {
    return error.statusCode;
  }

  if (
    Number.isInteger(error?.status)
  ) {
    return error.status;
  }

  if (error?.code === "P2025") {
    return 404;
  }

  if (error?.code === "P2002") {
    return 409;
  }

  return fallback;
};

const sendError = (
  res,
  error,
  fallbackMessage,
  fallbackStatus = 500
) => {
  console.error(
    fallbackMessage,
    error
  );

  return res
    .status(
      getErrorStatus(
        error,
        fallbackStatus
      )
    )
    .json({
      success: false,

      message:
        error?.message ||
        fallbackMessage,
    });
};

const writeAuditLog = async ({
  req,
  action,
  description,
}) => {
  try {
    await createAuditLog({
      user: req.user,

      action,

      module: "API_KEY",

      description,

      ip:
        req.ip ||
        req.headers[
          "x-forwarded-for"
        ] ||
        null,
    });
  } catch (error) {
    console.error(
      "API key audit log error:",
      error.message
    );
  }
};

const publishEvent = (
  eventName,
  payload,
  room = null
) => {
  try {
    if (
      typeof emitEvent !==
      "function"
    ) {
      return;
    }

    if (room) {
      emitEvent(
        eventName,
        payload,
        room
      );

      return;
    }

    emitEvent(
      eventName,
      payload
    );
  } catch (error) {
    console.error(
      `Socket event error (${eventName}):`,
      error.message
    );
  }
};

/*
 * Kada a tura plainApiKey ko hash
 * zuwa Socket.IO broadcast.
 */
const sanitizeKeyForEvent = (
  apiKey
) => {
  if (!apiKey) {
    return null;
  }

  const {
    plainApiKey,
    key: storedKey,
    warning,
    ...safeKey
  } = apiKey;

  return safeKey;
};

const checkPin = (pin) => {
  if (!SUPER_ADMIN_PIN) {
    throw createHttpError(
      "SUPER_ADMIN_PIN is not configured.",
      500
    );
  }

  const suppliedPin =
    normalizeText(pin);

  const configuredPin =
    normalizeText(
      SUPER_ADMIN_PIN
    );

  if (!suppliedPin) {
    return false;
  }

  const suppliedBuffer =
    Buffer.from(suppliedPin);

  const configuredBuffer =
    Buffer.from(configuredPin);

  if (
    suppliedBuffer.length !==
    configuredBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    suppliedBuffer,
    configuredBuffer
  );
};

const requireSuperAdminPin = (
  req
) => {
  if (!isSuperAdmin(req.user)) {
    throw createHttpError(
      "Only a Super Admin can perform this action.",
      403
    );
  }

  if (!checkPin(req.body?.pin)) {
    throw createHttpError(
      "Invalid Super Admin PIN.",
      403
    );
  }
};

const getAccessibleKey = async (
  req,
  keyId
) => {
  const apiKey =
    await keyService.getKey(
      keyId
    );

  if (!apiKey) {
    throw createHttpError(
      "API key was not found.",
      404
    );
  }

  /*
   * Admin/Super Admin na iya ganin
   * keys na kowane user.
   */
  if (isAdmin(req.user)) {
    return apiKey;
  }

  /*
   * Normal user zai iya sarrafa
   * key nasa kawai.
   */
  if (
    apiKey.userId !==
    req.user.id
  ) {
    throw createHttpError(
      "You are not authorized to access this API key.",
      403
    );
  }

  return apiKey;
};

/* ======================================================
   GET API KEYS

   GET /api/v1/api-keys
====================================================== */

exports.getKeys = async (
  req,
  res
) => {
  try {
    const query = {
      status:
        req.query.status,

      environment:
        req.query.environment,
    };

    /*
     * Admin na iya tace keys ta userId.
     * Normal user zai ga keys nasa kawai.
     */
    if (isAdmin(req.user)) {
      query.userId =
        normalizeText(
          req.query.userId
        ) || undefined;
    } else {
      query.userId =
        req.user.id;
    }

    const keys =
      await keyService.getKeys(
        query
      );

    return res.status(200).json({
      success: true,

      message:
        "API keys retrieved successfully.",

      keys,

      data: keys,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to retrieve API keys."
    );
  }
};

/* ======================================================
   GET ONE API KEY

   GET /api/v1/api-keys/:id
====================================================== */

exports.getKey = async (
  req,
  res
) => {
  try {
    const apiKey =
      await getAccessibleKey(
        req,
        req.params.id
      );

    return res.status(200).json({
      success: true,

      message:
        "API key retrieved successfully.",

      key: apiKey,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to retrieve API key."
    );
  }
};

/* ======================================================
   CREATE API KEY

   POST /api/v1/api-keys
====================================================== */

exports.createKey = async (
  req,
  res
) => {
  try {
    const requestedUserId =
      normalizeText(
        req.body.userId
      );

    let userId =
      req.user.id;

    /*
     * Admin na iya ƙirƙirar key ga wani user.
     * Normal user ba zai iya aika userId na wani ba.
     */
    if (
      requestedUserId &&
      requestedUserId !==
        req.user.id
    ) {
      if (!isAdmin(req.user)) {
        return res.status(403).json({
          success: false,

          message:
            "You cannot create an API key for another user.",
        });
      }

      userId =
        requestedUserId;
    }

    const key =
      await keyService.createKey({
        userId,

        name:
          req.body.name,

        environment:
          req.body.environment,

        scopes:
          req.body.scopes,

        rateLimitPerMinute:
          req.body
            .rateLimitPerMinute,

        rateLimitPerDay:
          req.body
            .rateLimitPerDay,

        expiresAt:
          req.body.expiresAt,
      });

    await writeAuditLog({
      req,

      action:
        "CREATE_API_KEY",

      description:
        `${req.user.email} created API key "${key.name}" for ${key.user?.email || userId}.`,
    });

    /*
     * Muhimmi:
     * Kada a saka plainApiKey cikin Socket.IO.
     */
    publishEvent(
      "api-key-created",
      {
        message:
          "API key created.",

        key:
          sanitizeKeyForEvent(
            key
          ),
      },
      `user-${userId}`
    );

    return res.status(201).json({
      success: true,

      message:
        "API key created successfully. Copy it now because it will not be shown again.",

      key,

      /*
       * Compatibility ga frontend.
       */
      plainApiKey:
        key.plainApiKey,

      warning:
        key.warning,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to create API key.",
      400
    );
  }
};

/* ======================================================
   ROTATE / REGENERATE API KEY

   PATCH /api/v1/api-keys/:id/regenerate
   PATCH /api/v1/api-keys/:id/rotate
====================================================== */

exports.regenerateKey = async (
  req,
  res
) => {
  try {
    const existingKey = await getAccessibleKey(
  req,
  req.params.id
);
    /*
     * Normal user zai iya rotate key nasa.
     *
     * Idan Super Admin yana rotate key na wani,
     * sai ya tabbatar da PIN.
     */
    const isAnotherUsersKey =
      existingKey.userId !==
      req.user.id;

    if (isAnotherUsersKey) {
      requireSuperAdminPin(req);
    }

    const key =
      await keyService.regenerateKey(
        existingKey.id
      );

    await writeAuditLog({
      req,

      action:
        "ROTATE_API_KEY",

      description:
        `${req.user.email} rotated API key "${key.name}" belonging to ${key.user?.email || key.userId}.`,
    });

    publishEvent(
      "api-key-regenerated",
      {
        message:
          "API key rotated.",

        key:
          sanitizeKeyForEvent(
            key
          ),
      },
      `user-${key.userId}`
    );

    return res.status(200).json({
      success: true,

      message:
        "API key rotated successfully. The previous key has stopped working.",

      key,

      plainApiKey:
        key.plainApiKey,

      warning:
        key.warning,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to rotate API key.",
      400
    );
  }
};

/* ======================================================
   CHANGE API KEY STATUS

   PATCH /api/v1/api-keys/:id/status
====================================================== */

exports.changeStatus = async (
  req,
  res
) => {
  try {
    const existingKey =
      await getAccessibleKey(
        req,
        req.params.id
      );

    const status =
      normalizeUppercase(
        req.body.status
      );

    if (
      !ALLOWED_STATUSES.includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid API key status.",
      });
    }

    /*
     * Normal user zai iya revoke key nasa.
     *
     * Reactivating ko marking EXPIRED
     * an bar shi ga Admin/Super Admin.
     */
    if (
      !isAdmin(req.user) &&
      status !== "REVOKED"
    ) {
      return res.status(403).json({
        success: false,

        message:
          "You can only revoke your own API key.",
      });
    }

    /*
     * Super Admin action akan key na wani
     * zai buƙaci PIN.
     */
    if (
      existingKey.userId !==
        req.user.id
    ) {
      requireSuperAdminPin(req);
    }

    const key =
      await keyService.changeStatus(
        existingKey.id,
        status
      );

    await writeAuditLog({
      req,

      action:
        "CHANGE_API_KEY_STATUS",

      description:
        `${req.user.email} changed API key "${key.name}" status to ${key.status}.`,
    });

    publishEvent(
      "api-key-status-changed",
      {
        message:
          "API key status changed.",

        key:
          sanitizeKeyForEvent(
            key
          ),
      },
      `user-${key.userId}`
    );

    return res.status(200).json({
      success: true,

      message:
        "API key status updated successfully.",

      key,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to change API key status.",
      400
    );
  }
};

/* ======================================================
   DELETE API KEY

   DELETE /api/v1/api-keys/:id
====================================================== */

exports.deleteKey = async (
  req,
  res
) => {
  try {
    const existingKey =
      await getAccessibleKey(
        req,
        req.params.id
      );

    /*
     * Don tsaro:
     * Normal user ya fara revoke key,
     * sannan ya iya delete.
     */
    if (
      !isAdmin(req.user) &&
      existingKey.status ===
        "ACTIVE"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Revoke the API key before deleting it.",
      });
    }

    /*
     * Idan ana delete key na wani user,
     * Super Admin PIN wajibi ne.
     */
    if (
      existingKey.userId !==
        req.user.id
    ) {
      requireSuperAdminPin(req);
    }

    const key =
      await keyService.deleteKey(
        existingKey.id
      );

    await writeAuditLog({
      req,

      action:
        "DELETE_API_KEY",

      description:
        `${req.user.email} deleted API key "${key.name}" belonging to ${key.user?.email || key.userId}.`,
    });

    publishEvent(
      "api-key-deleted",
      {
        message:
          "API key deleted.",

        keyId:
          existingKey.id,

        userId:
          existingKey.userId,
      },
      `user-${existingKey.userId}`
    );

    return res.status(200).json({
      success: true,

      message:
        "API key deleted successfully.",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to delete API key.",
      400
    );
  }
};

/* ======================================================
   STATISTICS

   GET /api/v1/api-keys/statistics
====================================================== */

exports.statistics = async (
  req,
  res
) => {
  try {
    /*
     * Global statistics na Admin/Super Admin ne kawai.
     */
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,

        message:
          "You are not authorized to view global API key statistics.",
      });
    }

    const stats =
      await keyService.statistics();

    return res.status(200).json({
      success: true,

      message:
        "API key statistics retrieved successfully.",

      stats,

      statistics: stats,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to retrieve API key statistics."
    );
  }
};