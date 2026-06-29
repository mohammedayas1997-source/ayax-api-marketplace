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

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const exists = await prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = normalizeRole(role);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
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

    const safeUser = cleanUser(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
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