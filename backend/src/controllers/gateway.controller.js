const prisma = require("../config/prisma");
const crypto = require("crypto");
const { emitEvent } = require("../config/socket");

exports.pairDevice = async (req, res) => {
  try {
    const { deviceName, deviceCode, location } = req.body;

    if (!deviceName || !deviceCode) {
      return res.status(400).json({
        success: false,
        message: "Device name and device code are required",
      });
    }

    const secretKey = crypto.randomBytes(32).toString("hex");

    const device = await prisma.gsmDevice.create({
      data: {
        name: deviceName,
        code: deviceCode,
        secretKey,
        location: location || null,
        status: "ONLINE",
        lastSeen: new Date(),
      },
    });

    emitEvent("gsm-device-paired", { device });

    return res.status(201).json({
      success: true,
      message: "Device paired successfully",
      deviceId: device.id,
      secretKey,
      device,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const { deviceId, secretKey, battery, charging, signal, internet } = req.body;

    const device = await prisma.gsmDevice.findFirst({
      where: { id: deviceId, secretKey },
    });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: "Invalid device credentials",
      });
    }

    const updated = await prisma.gsmDevice.update({
      where: { id: deviceId },
      data: {
        battery,
        charging,
        signal,
        internet,
        status: "ONLINE",
        lastSeen: new Date(),
      },
    });

    emitEvent("gsm-device-heartbeat", { device: updated });

    return res.json({
      success: true,
      message: "Heartbeat received",
      device: updated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.receiveCommandResult = async (req, res) => {
  try {
    const { deviceId, secretKey, reference, status, message } = req.body;

    const device = await prisma.gsmDevice.findFirst({
      where: { id: deviceId, secretKey },
    });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: "Invalid device credentials",
      });
    }

    const command = await prisma.gsmCommand.update({
      where: { reference },
      data: {
        status,
        response: message,
        completedAt: new Date(),
      },
    });

    emitEvent("gsm-command-result", { command });

    return res.json({
      success: true,
      message: "Command result received",
      command,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
exports.generatePairCode = async (req, res) => {
  try {
    const code =
      "AYAX-" + crypto.randomBytes(3).toString("hex").toUpperCase();

    const pairCode = await prisma.gsmPairCode.create({
      data: {
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Pair code generated",
      code: pairCode.code,
      expiresAt: pairCode.expiresAt,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getDevices = async (req, res) => {
  try {
    const devices = await prisma.gsmDevice.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      devices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.disconnectDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await prisma.gsmDevice.update({
      where: { id },
      data: {
        status: "OFFLINE",
      },
    });

    emitEvent("gsm-device-disconnected", {
      device,
    });

    return res.json({
      success: true,
      message: "Device disconnected successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.gsmDevice.delete({
      where: { id },
    });

    emitEvent("gsm-device-deleted", {
      id,
    });

    return res.json({
      success: true,
      message: "Device deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.renameDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const device = await prisma.gsmDevice.update({
      where: { id },
      data: {
        name,
      },
    });

    emitEvent("gsm-device-renamed", {
      device,
    });

    return res.json({
      success: true,
      device,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
exports.receiveIncomingSms = async (req, res) => {
  try {
    const { deviceId, secretKey, phoneNumber, message } = req.body;

    const device = await prisma.gsmDevice.findFirst({
      where: { id: deviceId, secretKey },
    });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: "Invalid device credentials",
      });
    }

    const sms = await prisma.smsInbox.create({
      data: {
        deviceId,
        phoneNumber,
        message,
      },
    });

    emitEvent("gsm-sms-received", { sms });

    return res.status(201).json({
      success: true,
      sms,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getIncomingSms = async (req, res) => {
  try {
    const sms = await prisma.smsInbox.findMany({
      include: {
        device: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return res.json({
      success: true,
      sms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getIncomingSms = async (req, res) => {
  try {
    const sms = await prisma.smsInbox.findMany({
      include: {
        device: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return res.json({
      success: true,
      sms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};