const prisma = require("../config/prisma");
const crypto = require("crypto");
const { emitEvent } = require("../config/socket");
const {
  markCommandProcessing,
  markCommandSuccessful,
  markCommandFailed,
} = require("../services/gatewayTransaction.service");
const {
  parseAirtimeBalance,
  parseDataBalance,
  parseExpiryDate,
} = require("../services/ussdParser.service");
const { sendBalanceCheckCommand } = require("../services/balanceCheck.service");

exports.pairDevice = async (req, res) => {
  try {
    const { deviceName, deviceCode, location } = req.body;

    if (!deviceName || !deviceCode) {
      return res.status(400).json({
        success: false,
        message: "Device name and device code are required",
      });
    }

    const pairCode = await prisma.gsmPairCode.findUnique({
      where: { code: deviceCode },
    });

    if (!pairCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid pair code. Generate a new pair code.",
      });
    }

    if (pairCode.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "This pair code has already been used.",
      });
    }

    if (new Date(pairCode.expiresAt) < new Date()) {
      await prisma.gsmPairCode.update({
        where: { code: deviceCode },
        data: { status: "EXPIRED" },
      });

      return res.status(400).json({
        success: false,
        message: "Pair code expired. Generate a new pair code.",
      });
    }

    const existingDevice = await prisma.gsmDevice.findUnique({
      where: { code: deviceCode },
    });

    if (existingDevice) {
      return res.status(400).json({
        success: false,
        message: "This pair code has already been used by another device.",
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

    await prisma.gsmPairCode.update({
      where: { code: deviceCode },
      data: {
        status: "USED",
        usedAt: new Date(),
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
    return res.status(400).json({ success: false, message: error.message });
  }
};


exports.generatePairCode = async (req, res) => {
  try {
    const code = "AYAX-" + crypto.randomBytes(3).toString("hex").toUpperCase();

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
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getDevices = async (req, res) => {
  try {
    const devices = await prisma.gsmDevice.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, devices });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.disconnectDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await prisma.gsmDevice.update({
      where: { id },
      data: { status: "OFFLINE" },
    });

    emitEvent("gsm-device-disconnected", { device });

    return res.json({
      success: true,
      message: "Device disconnected successfully",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.gsmDevice.delete({
      where: { id },
    });

    emitEvent("gsm-device-deleted", { id });

    return res.json({
      success: true,
      message: "Device deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.renameDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const device = await prisma.gsmDevice.update({
      where: { id },
      data: { name },
    });

    emitEvent("gsm-device-renamed", { device });

    return res.json({ success: true, device });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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
      data: { deviceId, phoneNumber, message },
    });

    emitEvent("gsm-sms-received", { sms });

    return res.status(201).json({ success: true, sms });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getIncomingSms = async (req, res) => {
  try {
    const sms = await prisma.smsInbox.findMany({
      include: { device: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return res.json({ success: true, sms });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
exports.syncSims = async (req, res) => {
  try {
    const { deviceId, secretKey, sims } = req.body;

    const device = await prisma.gsmDevice.findFirst({
      where: { id: deviceId, secretKey },
    });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: "Invalid device credentials",
      });
    }

    const saved = [];

    for (const sim of sims || []) {
      const item = await prisma.gsmSim.upsert({
        where: {
          deviceId_slotIndex: {
            deviceId,
            slotIndex: Number(sim.slotIndex),
          },
        },
        update: {
          carrierName: sim.carrierName,
          displayName: sim.displayName,
          phoneNumber:
          sim.phoneNumber ||
          sim.number ||
          null,
          countryIso: sim.countryIso,
          mcc: sim.mcc,
          mnc: sim.mnc,
          airtimeBalance: Number(sim.airtimeBalance || 0),
          dataBalance: sim.dataBalance || null,
          status: "ACTIVE",
          lastSyncAt: new Date(),
        },
        create: {
          deviceId,
          slotIndex: Number(sim.slotIndex),
          carrierName: sim.carrierName,
          displayName: sim.displayName,
          phoneNumber: sim.phoneNumber || sim.number || null,
          countryIso: sim.countryIso,
          mcc: sim.mcc,
          mnc: sim.mnc,
          airtimeBalance: Number(sim.airtimeBalance || 0),
          dataBalance: sim.dataBalance || null,
          status: "ACTIVE",
        },
      });

      saved.push(item);
    }

    emitEvent("gsm-sims-synced", { deviceId, sims: saved });

    return res.json({
      success: true,
      sims: saved,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDeviceSims = async (req, res) => {
  try {
    const sims = await prisma.gsmSim.findMany({
      where: { deviceId: req.params.deviceId },
      orderBy: { slotIndex: "asc" },
    });

    return res.json({
      success: true,
      sims,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.refreshSimBalance = async (req, res) => {
  try {
    const { simId, type = "AIRTIME" } = req.body;

    const sim = await prisma.gsmSim.findUnique({
      where: { id: simId },
      include: { device: true },
    });

    if (!sim) {
      return res.status(404).json({
        success: false,
        message: "SIM not found",
      });
    }

    const command = await sendBalanceCheckCommand({
      device: sim.device,
      sim,
      type,
    });

    emitEvent("gsm-sim-refresh", {
    simId: sim.id,
    deviceId: sim.deviceId,
    type,
});

    return res.status(201).json({
      success: true,
      message: "Balance check command sent",
      command,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getGatewayDevices = async (req, res) => {
  try {
    const devices = await prisma.gsmDevice.findMany({
      include: {
        sims: {
          orderBy: {
            slotIndex: "asc",
          },
        },
      },
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
exports.updateLocation = async (req, res) => {
  try {
    const {
      deviceId,
      secretKey,
      latitude,
      longitude,
      accuracy,
      speed,
      bearing,
    } = req.body;

    const device = await prisma.gsmDevice.findFirst({
      where: {
        id: deviceId,
        secretKey,
      },
    });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: "Invalid device credentials",
      });
    }

    const updated = await prisma.gsmDevice.update({
      where: {
        id: deviceId,
      },
      data: {
        latitude,
        longitude,
        accuracy,
        speed,
        bearing,
        locationAt: new Date(),
      },
    });

    emitEvent("gateway-location", {
      deviceId,
      latitude,
      longitude,
      accuracy,
      speed,
      bearing,
      locationAt: updated.locationAt,
    });

    return res.json({
      success: true,
      message: "Location updated",
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.receiveSecurityAlert = async (req, res) => {
  try {
    const { deviceId, secretKey, type, message } = req.body;

    const device = await prisma.gsmDevice.findFirst({
      where: { id: deviceId, secretKey },
    });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: "Invalid device credentials",
      });
    }

    const alert = await prisma.gatewaySecurityAlert.create({
      data: {
        deviceId,
        type,
        message,
      },
      include: {
        device: true,
      },
    });

    emitEvent("gateway-security-alert", { alert });

    return res.status(201).json({
      success: true,
      message: "Security alert received",
      alert,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getSecurityAlerts = async (req, res) => {
  try {
    const alerts = await prisma.gatewaySecurityAlert.findMany({
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
      alerts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.resolveSecurityAlert = async (req, res) => {
  try {
    const alert = await prisma.gatewaySecurityAlert.update({
      where: {
        id: req.params.id,
      },
      data: {
        resolved: true,
      },
    });

    emitEvent("gateway-security-alert-resolved", { alert });

    return res.json({
      success: true,
      message: "Alert resolved",
      alert,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
exports.startDeviceAlarm = async (req, res) => {
  try {

    const { deviceId } = req.body;

    const reference =
      "ALARM-" +
      crypto.randomBytes(6).toString("hex").toUpperCase();

    await prisma.gsmCommand.create({

      data: {

        reference,

        deviceId,

        type: "START_ALARM",

        status: "PENDING",

        payload: {}

      }

    });

    emitEvent(

      "gateway-command",

      {

        reference,

        type: "START_ALARM"

      },

      deviceId

    );

    return res.json({

      success: true

    });

  } catch (e) {

    return res.status(400).json({

      success: false,

      message: e.message

    });

  }

};
exports.stopDeviceAlarm = async (req, res) => {

  try {

    const { deviceId } = req.body;

    const reference =
      "STOPALARM-" +
      crypto.randomBytes(6).toString("hex").toUpperCase();

    await prisma.gsmCommand.create({

      data: {

        reference,

        deviceId,

        type: "STOP_ALARM",

        status: "PENDING",

        payload: {}

      }

    });

    emitEvent(

      "gateway-command",

      {

        reference,

        type: "STOP_ALARM"

      },

      deviceId

    );

    return res.json({

      success: true

    });

  } catch (e) {

    return res.status(400).json({

      success: false,

      message: e.message

    });

  }

};
exports.lockGatewayDevice = async (req, res) => {
  try {
    const { deviceId } = req.body;

    const reference =
      "LOCK-" +
      crypto.randomBytes(6).toString("hex").toUpperCase();

    await prisma.gsmCommand.create({
      data: {
        reference,
        deviceId,
        type: "LOCK_DEVICE",
        status: "PENDING",
        payload: {},
      },
    });

    emitEvent(
      "gateway-command",
      {
        reference,
        type: "LOCK_DEVICE",
      },
      deviceId
    );

    return res.json({
      success: true,
      message: "Lock command sent successfully",
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
    const {
      deviceId,
      secretKey,
      reference,
      status,
      message,
      response,
    } = req.body;

    if (!deviceId || !secretKey || !reference || !status) {
      return res.status(400).json({
        success: false,
        message: "deviceId, secretKey, reference and status are required",
      });
    }

    const device = await prisma.gsmDevice.findFirst({
      where: {
        id: deviceId,
        secretKey,
      },
    });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: "Invalid device credentials",
      });
    }

    const finalMessage =
      String(message || response || status || "").trim();

    let command;

    if (status === "PROCESSING" || status === "SENT") {
      command = await markCommandProcessing({
        reference,
        message: finalMessage,
      });
    } else if (
      status === "SUCCESSFUL" ||
      status === "DELIVERED"
    ) {
      command = await markCommandSuccessful({
        reference,
        message: finalMessage,
      });

      const simId = command?.payload?.simId;
      const service = command?.payload?.service;

      if (simId) {
        const updateData = {
          lastBalanceCheck: new Date(),
        };

        if (service === "AIRTIME_BALANCE") {
          const airtimeBalance =
            parseAirtimeBalance(finalMessage);

          if (airtimeBalance !== null) {
            updateData.airtimeBalance =
              Number(airtimeBalance);
          }
        }

        if (service === "DATA_BALANCE") {
          const dataBalance =
            parseDataBalance(finalMessage);

          if (dataBalance) {
            updateData.dataBalance = dataBalance;
          }
        }

        const expiryDate =
          parseExpiryDate(finalMessage);

        if (expiryDate) {
          const parsedExpiry =
            new Date(expiryDate);

          if (!Number.isNaN(parsedExpiry.getTime())) {
            updateData.expiryDate = parsedExpiry;
          }
        }

        const updatedSim = await prisma.gsmSim.update({
          where: {
            id: simId,
          },
          data: updateData,
        });

        emitEvent("gsm-sim-balance-updated", {
          deviceId,
          service,
          sim: updatedSim,
        });
      }
    } else {
      command = await markCommandFailed({
        reference,
        message: finalMessage || "Command failed",
      });
    }

    return res.json({
      success: true,
      message: "Command result received",
      command,
    });
  } catch (error) {
    console.error("receiveCommandResult error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getPairCodes = async (req, res) => {
  try {
    const pairCodes = await prisma.gsmPairCode.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return res.json({
      success: true,
      pairCodes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};