const prisma = require("../config/prisma");
const generateApiKey = require("../utils/generateApiKey");

exports.createKey = async ({ userId, name = "Live API Key" }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return prisma.apiKey.create({
    data: {
      userId,
      name,
      key: generateApiKey(),
      status: "ACTIVE",
    },
  });
};

exports.getKeysByUser = async (userId) => {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

exports.verifyKey = async (key) => {
  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: {
      user: {
        include: {
          wallet: true,
        },
      },
    },
  });

  if (!apiKey) {
    throw new Error("Invalid API key");
  }

  if (apiKey.status !== "ACTIVE") {
    throw new Error("API key is not active");
  }

  if (!apiKey.user || apiKey.user.status !== "ACTIVE") {
    throw new Error("User account is not active");
  }

  return apiKey;
};

exports.regenerateKey = async (id) => {
  return prisma.apiKey.update({
    where: { id },
    data: {
      key: generateApiKey(),
      status: "ACTIVE",
    },
  });
};

exports.revokeKey = async (id) => {
  return prisma.apiKey.update({
    where: { id },
    data: {
      status: "REVOKED",
    },
  });
};

exports.deleteKey = async (id) => {
  return prisma.apiKey.delete({
    where: { id },
  });
};