const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const prisma = require("../config/prisma");

/* ======================================================
   CONSTANTS
====================================================== */

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const OTP_HASH_ROUNDS = 12;

/* ======================================================
   HELPERS
====================================================== */

const normalizeOtp = (value) => {
  return String(value || "")
    .replace(/\D/g, "")
    .trim();
};

const generateOtp = () => {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
};

/* ======================================================
   CREATE LOGIN OTP
====================================================== */

const createLoginOtp = async (userId) => {
  if (!userId) {
    const error = new Error(
      "User ID is required to create a login OTP."
    );

    error.statusCode = 400;

    throw error;
  }

  /*
   * Kashe duk tsofaffin OTP da ba a yi amfani
   * da su ba kafin ƙirƙirar sabon OTP.
   */
  await prisma.loginOtp.updateMany({
    where: {
      userId,
      used: false,
    },

    data: {
      used: true,
    },
  });

  const code = generateOtp();

  const codeHash = await bcrypt.hash(
    code,
    OTP_HASH_ROUNDS
  );

  const expiresAt = new Date(
    Date.now() +
      OTP_EXPIRY_MINUTES *
        60 *
        1000
  );

  const otpRecord =
    await prisma.loginOtp.create({
      data: {
        userId,
        codeHash,
        expiresAt,
        used: false,
        attempts: 0,
      },

      select: {
        id: true,
        userId: true,
        expiresAt: true,
        createdAt: true,
      },
    });

  return {
    code,
    otpId: otpRecord.id,
    userId: otpRecord.userId,
    expiresAt: otpRecord.expiresAt,
    createdAt: otpRecord.createdAt,
  };
};

/* ======================================================
   VERIFY LOGIN OTP
====================================================== */

const verifyLoginOtp = async ({
  userId,
  otpId,
  code,
}) => {
  const normalizedCode =
    normalizeOtp(code);

  if (
    !userId ||
    !otpId ||
    normalizedCode.length !== 6
  ) {
    return {
      success: false,
      code: "INVALID_OTP_REQUEST",
      message:
        "A valid 6-digit OTP is required.",
    };
  }

  const otpRecord =
    await prisma.loginOtp.findFirst({
      where: {
        id: otpId,
        userId,
        used: false,
      },
    });

  if (!otpRecord) {
    return {
      success: false,
      code: "OTP_NOT_FOUND",
      message:
        "OTP was not found, has already been used, or has been replaced.",
    };
  }

  if (
    otpRecord.expiresAt.getTime() <=
    Date.now()
  ) {
    await prisma.loginOtp.update({
      where: {
        id: otpRecord.id,
      },

      data: {
        used: true,
      },
    });

    return {
      success: false,
      code: "OTP_EXPIRED",
      message:
        "OTP has expired. Please request a new OTP.",
    };
  }

  if (
    Number(otpRecord.attempts || 0) >=
    MAX_ATTEMPTS
  ) {
    await prisma.loginOtp.update({
      where: {
        id: otpRecord.id,
      },

      data: {
        used: true,
      },
    });

    return {
      success: false,
      code: "OTP_MAX_ATTEMPTS",
      message:
        "Maximum OTP attempts exceeded. Please request a new OTP.",
    };
  }

  const valid =
    await bcrypt.compare(
      normalizedCode,
      otpRecord.codeHash
    );

  if (!valid) {
    const updatedOtp =
      await prisma.loginOtp.update({
        where: {
          id: otpRecord.id,
        },

        data: {
          attempts: {
            increment: 1,
          },
        },

        select: {
          attempts: true,
        },
      });

    const remainingAttempts =
      Math.max(
        MAX_ATTEMPTS -
          Number(
            updatedOtp.attempts || 0
          ),
        0
      );

    if (remainingAttempts === 0) {
      await prisma.loginOtp.update({
        where: {
          id: otpRecord.id,
        },

        data: {
          used: true,
        },
      });
    }

    return {
      success: false,
      code:
        remainingAttempts === 0
          ? "OTP_MAX_ATTEMPTS"
          : "INVALID_OTP",

      message:
        remainingAttempts === 0
          ? "Maximum OTP attempts exceeded. Please request a new OTP."
          : "The OTP you entered is incorrect.",

      remainingAttempts,
    };
  }

  /*
   * Mark OTP used immediately domin kada
   * a sake amfani da shi.
   */
  await prisma.loginOtp.update({
    where: {
      id: otpRecord.id,
    },

    data: {
      used: true,
    },
  });

  /*
   * Kashe sauran OTP na user domin kariya.
   */
  await prisma.loginOtp.updateMany({
    where: {
      userId,
      id: {
        not: otpRecord.id,
      },
      used: false,
    },

    data: {
      used: true,
    },
  });

  return {
    success: true,
    code: "OTP_VERIFIED",
    message:
      "OTP verified successfully.",
  };
};

/* ======================================================
   CLEAN EXPIRED OTP RECORDS
====================================================== */

const cleanupExpiredLoginOtps = async () => {
  try {
    return await prisma.loginOtp.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },

          {
            used: true,
            createdAt: {
              lt: new Date(
                Date.now() -
                  24 *
                    60 *
                    60 *
                    1000
              ),
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error(
      "Login OTP cleanup error:",
      error.message
    );

    return null;
  }
};

module.exports = {
  createLoginOtp,
  verifyLoginOtp,
  cleanupExpiredLoginOtps,

  OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS,
};