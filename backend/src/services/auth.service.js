const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateApiKey = require("../utils/generateApiKey");

const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET || "ayax_secret_change_me",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

exports.register = async ({ name, email, phone, password }) => {
  const exists = await prisma.user.findUnique({
    where: { email },
  });

  if (exists) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      password: hashedPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
      wallet: {
        create: {
          balance: 0,
        },
      },
      apiKeys: {
        create: {
          key: generateApiKey(),
          name: "Live API Key",
          status: "ACTIVE",
        },
      },
    },
    include: {
      wallet: true,
      apiKeys: true,
    },
  });

  const { password: _, ...safeUser } = user;

  return {
    user: safeUser,
    token: signToken(user),
  };
};

exports.login = async ({ email, password, ipAddress, userAgent }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      wallet: true,
      apiKeys: true,
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Account is not active");
  }

  const matched = await bcrypt.compare(password, user.password);

  if (!matched) {
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: ipAddress || null,
        device: userAgent || null,
        successful: false,
      },
    });

    throw new Error("Invalid credentials");
  }

  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      ipAddress: ipAddress || null,
      device: userAgent || null,
      successful: true,
    },
  });

  const { password: _, ...safeUser } = user;

  return {
    user: safeUser,
    token: signToken(user),
  };
};

exports.getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      apiKeys: true,
      notifications: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const { password: _, ...safeUser } = user;

  return safeUser;
};

exports.changePassword = async ({ userId, oldPassword, newPassword }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const matched = await bcrypt.compare(oldPassword, user.password);

  if (!matched) {
    throw new Error("Old password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
    },
  });

  await prisma.securityLog.create({
    data: {
      userId,
      event: "PASSWORD_CHANGED",
      description: "User changed account password",
      successful: true,
    },
  });

  return true;
};