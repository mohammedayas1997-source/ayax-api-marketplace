const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const createAuditLog = require("../utils/audit");
const { emitEvent } = require("../config/socket");

const normalizeRole = (role) => {
  if (!role) return "CUSTOMER";
  return String(role).toUpperCase();
};

const {
  sendWelcomeNotification,
} = require("../services/notification.service");

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role: normalizeRole(role) },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const generateApiKey = () => {
  return `ayax_live_${crypto.randomBytes(24).toString("hex")}`;
};

const cleanUser = (user) => {
  const { password, ...safeUser } = user;
  return {
    ...safeUser,
    role: normalizeRole(safeUser.role),
  };
};

const createWelcomeNotification = async (user) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        batchId: crypto.randomUUID(),

        userId: user.id,

        title: "🎉 Welcome to Ayax APIs",

        message: `Hello ${user.name},

Welcome to Ayax APIs Developer Marketplace.

Your account has been created successfully.

You can now:
• Fund your wallet
• Generate API Keys
• Access all developer services
• Track your transactions

Thank you for choosing Ayax Digital Solutions.`,

        type: "SUCCESS",
        priority: "NORMAL",
        audience: "USER",

        actionText: "Open Dashboard",
        actionUrl: "/dashboard",

        isRead: false,

        createdByName: "Ayax System",
        createdByEmail: "system@ayaxdigital.solutions",
      },
    });

    emitEvent("notification:new", {
      userId: user.id,
      notification,
    });

    return notification;
  } catch (error) {
    console.error("Welcome notification error:", error);
    return null;
  }
};

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
    } = req.body;

    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedPhone = phone
      ? String(phone).trim()
      : null;

    if (
      !normalizedName ||
      !normalizedEmail ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters",
      });
    }

    const exists = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const userRole = "CUSTOMER";

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        password: hashedPassword,
        role: userRole,

        wallet: {
          create: {
            balance: 0,
          },
        },

        apiKeys: {
          create: {
            key: generateApiKey(),
            name: "Live API Key",
          },
        },
      },

      include: {
        wallet: true,
        apiKeys: true,
      },
    });

    await createAuditLog({
      user,
      action: "REGISTER",
      module: "AUTH",
      description: `${user.email} registered`,
      ip: req.ip,
    });

    await createWelcomeNotification(user);

    const welcomeNotification =
      await createWelcomeNotification(user);

    const safeUser = cleanUser(user);

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Welcome to Ayax APIs.",
      token: generateToken(
        user.id,
        user.role
      ),
      user: safeUser,
      notification: welcomeNotification,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to complete registration",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        wallet: true,
        apiKeys: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.status && user.status.toLowerCase() !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    await createAuditLog({
      user,
      action: "LOGIN",
      module: "AUTH",
      description: `${user.email} logged in`,
      ip: req.ip,
    });

    const safeUser = cleanUser(user);

    return res.json({
      success: true,
      message: "Login successful",
      token: generateToken(user.id, user.role),
      user: safeUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        wallet: true,
        apiKeys: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const safeUser = cleanUser(user);

    return res.json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        wallet: {
          select: {
            id: true,
            balance: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        apiKeys: {
          where: {
            status: "ACTIVE",
          },
          select: {
            id: true,
            name: true,
            status: true,
            environment: true,
            scopes: true,
            keyPrefix: true,
            lastUsedAt: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },

        _count: {
          select: {
            apiKeys: true,
            transactions: true,
            notifications: true,
            apiUsages: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        wallet: {
          id: user.wallet?.id || null,
          balance: Number(user.wallet?.balance || 0),
          createdAt: user.wallet?.createdAt || null,
          updatedAt: user.wallet?.updatedAt || null,
        },

        activeApiKeys: user.apiKeys.length,
        apiKeys: user.apiKeys,

        statistics: {
          totalApiKeys: user._count.apiKeys,
          totalTransactions: user._count.transactions,
          totalNotifications: user._count.notifications,
          totalApiCalls: user._count.apiUsages,
        },
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user profile.",
    });
  }
};