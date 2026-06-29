const prisma = require("../../config/prisma");
const crypto = require("crypto");

const generateApiKey = () => {
  return (
    "ayax_live_" +
    crypto.randomBytes(32).toString("hex")
  );
};

// =========================================

exports.getKeys = async ({
  userId,
  status,
}) => {

  return prisma.apiKey.findMany({

    where: {

      AND: [

        userId
          ? { userId }
          : {},

        status &&
        status !== "ALL"
          ? { status }
          : {},

      ],

    },

    include: {
      user: true,
    },

    orderBy: {
      createdAt: "desc",
    },

  });

};

// =========================================

exports.getKey = async (id) => {

  return prisma.apiKey.findUnique({

    where: { id },

    include: {
      user: true,
    },

  });

};

// =========================================

exports.createKey =
  async (data) => {

    return prisma.apiKey.create({

      data: {

        userId: data.userId,

        name: data.name,

        key: generateApiKey(),

        status: "ACTIVE",

      },

      include: {
        user: true,
      },

    });

};

// =========================================

exports.regenerateKey =
  async (id) => {

    return prisma.apiKey.update({

      where: { id },

      data: {

        key: generateApiKey(),

        status: "ACTIVE",

      },

      include: {
        user: true,
      },

    });

};

// =========================================

exports.changeStatus =
  async (id, status) => {

    return prisma.apiKey.update({

      where: { id },

      data: {
        status,
      },

    });

};

// =========================================

exports.deleteKey =
  async (id) => {

    return prisma.apiKey.delete({

      where: { id },

    });

};

// =========================================

exports.statistics =
  async () => {

    const [

      total,

      active,

      revoked,

      expired,

    ] =
      await Promise.all([

        prisma.apiKey.count(),

        prisma.apiKey.count({
          where: {
            status: "ACTIVE",
          },
        }),

        prisma.apiKey.count({
          where: {
            status: "REVOKED",
          },
        }),

        prisma.apiKey.count({
          where: {
            status: "EXPIRED",
          },
        }),

      ]);

    return {

      total,

      active,

      revoked,

      expired,

    };

};