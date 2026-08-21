const crypto = require("crypto");
const prisma = require("../config/prisma");

exports.pairDevice = async (payload) => {
  const {
    pairCode,
    deviceName,
    brand,
    model,
    uniqueId,
    androidVersion,
    manufacturer,
    appVersion,
    ipAddress,
  } = payload;

  if (!pairCode || !deviceName || !uniqueId) {
    throw new Error("Pair code, device name and unique ID are required");
  }

  const token = crypto.randomBytes(48).toString("hex");

  const device = await prisma.gatewayDevice.upsert({
    where: { uniqueId },
    update: {
      pairCode,
      token,
      deviceName,
      brand: brand || "Unknown",
      model: model || "Unknown",
      androidVersion,
      manufacturer,
      appVersion,
      ipAddress,
      status: "ONLINE",
      lastSeen: new Date(),
    },
    create: {
      pairCode,
      token,
      deviceName,
      brand: brand || "Unknown",
      model: model || "Unknown",
      uniqueId,
      androidVersion,
      manufacturer,
      appVersion,
      ipAddress,
      status: "ONLINE",
      lastSeen: new Date(),
    },
  });

  return { device, token };
};

exports.heartbeat = async ({ token, batteryLevel, signalLevel, simCount, socketId }) => {
  const device = await prisma.gatewayDevice.findUnique({
    where: { token },
  });

  if (!device) throw new Error("Invalid gateway token");

  const updatedDevice = await prisma.gatewayDevice.update({
    where: { id: device.id },
    data: {
      batteryLevel: Number(batteryLevel || 0),
      signalLevel: Number(signalLevel || 0),
      simCount: Number(simCount || 0),
      socketId: socketId || device.socketId,
      status: "ONLINE",
      lastSeen: new Date(),
    },
  });

  // Fetch pending commands for this gateway device
  const pendingCommands = await prisma.gsmCommand.findMany({
    where: {
      OR: [
        { deviceId: device.id },
        { deviceId: null }
      ],
      status: "PENDING",
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  return {
    device: updatedDevice,
    commands: pendingCommands,
  };
};

exports.getDevices = async () => {
  return prisma.gatewayDevice.findMany({
    orderBy: { createdAt: "desc" },
  });
};