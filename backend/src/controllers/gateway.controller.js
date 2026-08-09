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

const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const parseExpiryToDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();

  const dayFirstNumeric = text.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/
  );
  if (dayFirstNumeric) {
    const [, day, month, rawYear] = dayFirstNumeric;
    const year = rawYear.length === 2 ? Number(`20${rawYear}`) : Number(rawYear);
    const date = new Date(year, Number(month) - 1, Number(day), 23, 59, 59);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const yearFirstNumeric = text.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
  );
  if (yearFirstNumeric) {
    const [, year, month, day] = yearFirstNumeric;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dayMonthName = text.match(
    /^(\d{1,2})[\s\-]+([A-Za-z]{3,9})[\s\-]+(\d{2,4})$/
  );
  if (dayMonthName) {
    const [, day, monthName, rawYear] = dayMonthName;
    const month = MONTHS[monthName.toLowerCase()];
    if (month !== undefined) {
      const year = rawYear.length === 2 ? Number(`20${rawYear}`) : Number(rawYear);
      const date = new Date(year, month, Number(day), 23, 59, 59);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const monthNameDay = text.match(
    /^([A-Za-z]{3,9})[\s\-]+(\d{1,2})[\s\-,]+(\d{2,4})$/
  );
  if (monthNameDay) {
    const [, monthName, day, rawYear] = monthNameDay;
    const month = MONTHS[monthName.toLowerCase()];
    if (month !== undefined) {
      const year = rawYear.length === 2 ? Number(`20${rawYear}`) : Number(rawYear);
      const date = new Date(year, month, Number(day), 23, 59, 59);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// 1. pairDevice
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

// 2. heartbeat
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

// 3. generatePairCode
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

// 4. getDevices
exports.getDevices = async (req, res) => {
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

    return res.json({ success: true, devices });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. disconnectDevice
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

// 6. deleteDevice
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

// 7. renameDevice
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

// 8. receiveIncomingSms
exports.receiveIncomingSms = async (req, res) => {
  try {
    const {
      deviceId,
      secretKey,
      phoneNumber,
      message,
      slotIndex,
      subscriptionId,
      receivedAt,
    } = req.body;

    if (!deviceId || !secretKey || !message) {
      return res.status(400).json({
        success: false,
        message: "deviceId, secretKey and message are required",
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

    const sms = await prisma.smsInbox.create({
      data: {
        deviceId,
        phoneNumber: phoneNumber || "Unknown",
        message,
      },
    });

    const parsedDataBalance = parseDataBalance(message);
    const parsedAirtimeBalance = parseAirtimeBalance(message);

    let updatedSim = null;

    if (slotIndex !== undefined && slotIndex !== null) {
      const normalizedSlot = Number(slotIndex);

      if (!Number.isNaN(normalizedSlot)) {
        const sim = await prisma.gsmSim.findUnique({
          where: {
            deviceId_slotIndex: {
              deviceId,
              slotIndex: normalizedSlot,
            },
          },
        });

        if (sim) {
          const updateData = {
            lastSyncAt: new Date(),
            lastBalanceCheck: new Date(),
          };

          if (
            parsedDataBalance !== null &&
            parsedDataBalance !== undefined &&
            String(parsedDataBalance).trim() !== ""
          ) {
            updateData.dataBalance = String(parsedDataBalance).trim();
          }

          if (
            parsedAirtimeBalance !== null &&
            parsedAirtimeBalance !== undefined &&
            !Number.isNaN(Number(parsedAirtimeBalance))
          ) {
            updateData.airtimeBalance = Number(parsedAirtimeBalance);
          }

          const parsedExpiry = parseExpiryDate(message);
          if (parsedExpiry) {
            const formattedDate = parseExpiryToDate(parsedExpiry);
            if (formattedDate) {
              updateData.expiryDate = formattedDate;
            }
          }

          const hasBalance =
            Object.prototype.hasOwnProperty.call(updateData, "dataBalance") ||
            Object.prototype.hasOwnProperty.call(updateData, "airtimeBalance") ||
            Object.prototype.hasOwnProperty.call(updateData, "expiryDate");

          if (hasBalance) {
            updatedSim = await prisma.gsmSim.update({
              where: {
                id: sim.id,
              },
              data: updateData,
            });

            emitEvent("gsm-sims-synced", {
              deviceId,
              sims: [updatedSim],
            });

            emitEvent("gsm-sim-balance-updated", {
              deviceId,
              simId: updatedSim.id,
              slotIndex: normalizedSlot,
              airtimeBalance: updatedSim.airtimeBalance,
              dataBalance: updatedSim.dataBalance,
              expiryDate: updatedSim.expiryDate,
              sim: updatedSim,
            });
          }
        }
      }
    }

    emitEvent("gsm-sms-received", {
      sms,
      slotIndex,
      subscriptionId,
      receivedAt,
    });

    return res.status(201).json({
      success: true,
      message: updatedSim
        ? "SMS received and SIM balance updated"
        : "SMS received successfully",
      sms,
      airtimeBalance: parsedAirtimeBalance,
      dataBalance: parsedDataBalance,
      sim: updatedSim,
    });
  } catch (error) {
    console.error("Incoming SMS error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// 9. getIncomingSms
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

// 10. syncSims
exports.syncSims = async (req, res) => {
  try {
    const { deviceId, secretKey, sims } = req.body;

    if (!deviceId || !secretKey) {
      return res.status(400).json({
        success: false,
        message: "deviceId and secretKey are required",
      });
    }

    if (!Array.isArray(sims)) {
      return res.status(400).json({
        success: false,
        message: "sims must be an array",
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

    const savedSims = [];

    for (const sim of sims) {
      const slotIndex = Number(sim.slotIndex);

      if (!Number.isInteger(slotIndex) || slotIndex < 0) {
        continue;
      }

      const savedSim = await prisma.gsmSim.upsert({
        where: {
          deviceId_slotIndex: {
            deviceId,
            slotIndex,
          },
        },
        update: {
          carrierName: sim.carrierName || sim.displayName || "Unknown",
          displayName: sim.displayName || sim.carrierName || "Unknown",
          phoneNumber: sim.phoneNumber || sim.number || null,
          countryIso: sim.countryIso || null,
          mcc: sim.mcc === null || sim.mcc === undefined || sim.mcc === "" ? null : Number(sim.mcc),
          mnc: sim.mnc === null || sim.mnc === undefined || sim.mnc === "" ? null : Number(sim.mnc),
          status: "ACTIVE",
          lastSyncAt: new Date(),
        },
        create: {
          deviceId,
          slotIndex,
          carrierName: sim.carrierName || sim.displayName || "Unknown",
          displayName: sim.displayName || sim.carrierName || "Unknown",
          phoneNumber: sim.phoneNumber || sim.number || null,
          countryIso: sim.countryIso || null,
          mcc: sim.mcc === null || sim.mcc === undefined || sim.mcc === "" ? null : Number(sim.mcc),
          mnc: sim.mnc === null || sim.mnc === undefined || sim.mnc === "" ? null : Number(sim.mnc),
          status: "ACTIVE",
          lastSyncAt: new Date(),
        },
      });

      savedSims.push(savedSim);
    }

    emitEvent("gsm-sims-synced", {
      deviceId,
      sims: savedSims,
    });

    return res.json({
      success: true,
      message: "SIM cards synced successfully",
      sims: savedSims,
    });
  } catch (error) {
    console.error("syncSims error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// 11. getDeviceSims
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

// 12. refreshSimBalance
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

// 13. getGatewayDevices
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

// 14. updateLocation
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

// 15. receiveSecurityAlert
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

// 16. getSecurityAlerts
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

// 17. resolveSecurityAlert
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

// 18. startDeviceAlarm
exports.startDeviceAlarm = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const reference = "ALARM-" + crypto.randomBytes(6).toString("hex").toUpperCase();

    await prisma.gsmCommand.create({
      data: {
        reference,
        deviceId,
        type: "START_ALARM",
        status: "PENDING",
        payload: {},
      },
    });

    emitEvent("gateway-command", { reference, type: "START_ALARM" }, deviceId);

    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// 19. stopDeviceAlarm
exports.stopDeviceAlarm = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const reference = "STOPALARM-" + crypto.randomBytes(6).toString("hex").toUpperCase();

    await prisma.gsmCommand.create({
      data: {
        reference,
        deviceId,
        type: "STOP_ALARM",
        status: "PENDING",
        payload: {},
      },
    });

    emitEvent("gateway-command", { reference, type: "STOP_ALARM" }, deviceId);

    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// 20. lockGatewayDevice
exports.lockGatewayDevice = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const reference = "LOCK-" + crypto.randomBytes(6).toString("hex").toUpperCase();

    await prisma.gsmCommand.create({
      data: {
        reference,
        deviceId,
        type: "LOCK_DEVICE",
        status: "PENDING",
        payload: {},
      },
    });

    emitEvent("gateway-command", { reference, type: "LOCK_DEVICE" }, deviceId);

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

// 21. receiveCommandResult
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
      where: { id: deviceId, secretKey },
    });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: "Invalid device credentials",
      });
    }

    const existingCommand = await prisma.gsmCommand.findUnique({
      where: { reference },
    });

    if (!existingCommand) {
      return res.status(404).json({
        success: false,
        message: "Gateway command not found",
      });
    }

    if (existingCommand.deviceId !== deviceId) {
      return res.status(403).json({
        success: false,
        message: "This command does not belong to this device",
      });
    }

    const normalizedStatus = String(status || "").trim().toUpperCase();
    const finalMessage = String(message || response || "").trim();

    await prisma.gsmCommand.update({
      where: { reference },
      data: {
        response: finalMessage,
        updatedAt: new Date(),
      },
    });

    emitEvent("gateway-command-updated", { reference });

    const normalizedMessage = finalMessage.toLowerCase();

    const waitingStates = ["WAITING", "PROCESSING", "PENDING", "SENT"];
    const successStates = ["SUCCESS", "SUCCESSFUL", "COMPLETED", "DELIVERED"];
    const failedStates = ["FAILED", "FAILURE", "ERROR", "CANCELLED"];

    const waitingKeywords = [
      "awaiting network response", "awaiting ussd response", "request submitted",
      "request opened", "command received", "loading", "please wait",
      "processing", "sending", "running", "connecting", "ussd running",
      "ussd request sent", "checking", "fetching", "working", "dialing",
      "executing", "wait...",
    ];

    const invalidKeywords = [
      "invalid", "invalid choice", "invalid option", "wrong selection",
      "connection problem", "network error", "try again later", "failed",
      "error", "problem performing request",
    ];

    const isTemporaryMessage = waitingKeywords.some((keyword) => normalizedMessage.includes(keyword));
    const isInvalidUssdMessage = invalidKeywords.some((keyword) => normalizedMessage.includes(keyword));

    const autoReplyMatch =
      finalMessage.match(/reply\s+(?:with\s+)?(\d+)/i) ||
      finalMessage.match(/select\s+(\d+)/i) ||
      finalMessage.match(/choose\s+(\d+)/i) ||
      finalMessage.match(/press\s+(\d+)/i) ||
      finalMessage.match(/enter\s+(\d+)/i);

    const autoReply = autoReplyMatch?.[1] || null;
    const payload = existingCommand.payload || {};

    const ussdSession = {
      sessionId: payload.sessionId || null,
      step: Number(payload.step || 1),
      nextCode: payload.nextCode || null,
    };

    const simId = payload.simId || req.body.simId || null;
    const balanceType = String(
      payload.balanceType || req.body.balanceType || payload.service || req.body.service || payload.type || req.body.requestType || ""
    ).trim().toUpperCase();

    const isAirtimeCommand = ["AIRTIME", "AIRTIME_BALANCE", "CHECK_AIRTIME"].includes(balanceType);
    const isDataCommand = ["DATA", "DATA_BALANCE", "CHECK_DATA"].includes(balanceType);
    const isBalanceCommand = Boolean(simId) && (isAirtimeCommand || isDataCommand);

    let command = existingCommand;
    let updatedSim = null;

    if (
      isBalanceCommand &&
      (waitingStates.includes(normalizedStatus) || isTemporaryMessage) &&
      !successStates.includes(normalizedStatus)
    ) {
      command = await markCommandProcessing({
        reference,
        message: finalMessage || "Waiting for complete USSD response",
      });

      await prisma.gsmUssdLog.create({
        data: {
          id: crypto.randomUUID(),
          deviceId,
          reference,
          request: null,
          response: finalMessage,
          status: normalizedStatus,
        },
      });

      emitEvent("gateway-ussd-waiting", {
        deviceId,
        reference,
        sessionId: ussdSession.sessionId,
        step: ussdSession.step,
        message: finalMessage,
      });

      if (autoReply && ussdSession.sessionId) {
        const nextReference = "USSD-" + crypto.randomBytes(6).toString("hex").toUpperCase();

        await prisma.gsmCommand.create({
          data: {
            reference: nextReference,
            deviceId,
            type: "USSD_REPLY",
            status: "PENDING",
            payload: {
              sessionId: ussdSession.sessionId,
              step: ussdSession.step + 1,
              reply: autoReply,
              simId,
              balanceType,
            },
          },
        });

        emitEvent(
          "gateway-command",
          {
            reference: nextReference,
            type: "USSD_REPLY",
            reply: autoReply,
            sessionId: ussdSession.sessionId,
          },
          deviceId
        );
      }

      return res.json({
        success: true,
        pending: true,
        waiting: true,
        command,
      });
    }

    if (isBalanceCommand && isInvalidUssdMessage && !successStates.includes(normalizedStatus)) {
      command = await markCommandFailed({
        reference,
        message: finalMessage || "Network rejected USSD request",
      });

      await prisma.gsmUssdLog.create({
        data: {
          id: crypto.randomUUID(),
          deviceId,
          reference,
          response: finalMessage,
          status: normalizedStatus,
        },
      });

      await prisma.gsmDevice.update({
        where: { id: deviceId },
        data: { status: "ONLINE", lastSeen: new Date() },
      });

      return res.status(422).json({
        success: false,
        code: "INVALID_USSD_RESPONSE",
        message: "Network rejected the balance request",
        command,
        sim: null,
      });
    }

    if (normalizedStatus === "WAITING" || waitingStates.includes(normalizedStatus) || normalizedStatus === "SENT") {
      if (!successStates.includes(normalizedStatus) && !isTemporaryMessage) {
        command = await markCommandProcessing({
          reference,
          message: finalMessage || "Command is being processed",
        });
      }
    } 

    if (successStates.includes(normalizedStatus) || (!waitingStates.includes(normalizedStatus) && !isTemporaryMessage)) {
      let airtimeBalance = null;
      let dataBalance = null;
      let expiryValue = null;

      if (isAirtimeCommand) {
        airtimeBalance = parseAirtimeBalance(finalMessage);
      }

      if (isDataCommand) {
        const parsedDataBalance = parseDataBalance(finalMessage);
        if (parsedDataBalance !== null && parsedDataBalance !== undefined && String(parsedDataBalance).trim() !== "") {
          dataBalance = String(parsedDataBalance).trim();
        }
      }

      expiryValue = parseExpiryDate(finalMessage);

      const hasAirtimeBalance = airtimeBalance !== null && airtimeBalance !== undefined && !Number.isNaN(Number(airtimeBalance));
      const hasDataBalance = dataBalance !== null && dataBalance !== undefined && String(dataBalance).trim() !== "";

      if (isBalanceCommand && !hasAirtimeBalance && !hasDataBalance && !isInvalidUssdMessage && !failedStates.includes(normalizedStatus)) {
        command = await markCommandProcessing({
          reference,
          message: finalMessage || "Waiting for final balance response",
        });

        await prisma.gsmUssdLog.create({
          data: {
            id: crypto.randomUUID(),
            deviceId,
            reference,
            response: finalMessage,
            status: normalizedStatus,
          },
        });

        return res.json({
          success: true,
          pending: true,
          waiting: true,
          message: "Waiting for valid balance payload",
          command,
        });
      }

      if (isBalanceCommand && !hasAirtimeBalance && !hasDataBalance) {
        command = await markCommandFailed({
          reference,
          message: "Could not parse balance from USSD response",
        });

        return res.status(422).json({
          success: false,
          code: "PARSE_BALANCE_FAILED",
          message: "USSD response received but failed to parse balance",
          response: finalMessage,
          command,
        });
      }

      command = await markCommandSuccessful({
        reference,
        message: finalMessage || "Balance check successful",
      });

      if (isBalanceCommand && simId) {
        const simUpdateData = {
          lastSyncAt: new Date(),
          lastBalanceCheck: new Date(),
        };

        if (hasAirtimeBalance) {
          simUpdateData.airtimeBalance = Number(airtimeBalance);
        }

        if (hasDataBalance) {
          simUpdateData.dataBalance = dataBalance;
        }

        if (expiryValue) {
          const formattedExpiry = parseExpiryToDate(expiryValue);
          if (formattedExpiry) {
            simUpdateData.expiryDate = formattedExpiry;
          }
        }

        updatedSim = await prisma.gsmSim.update({
          where: { id: simId },
          data: simUpdateData,
        });

        emitEvent("gsm-sims-synced", {
          deviceId,
          sims: [updatedSim],
        });

        emitEvent("gsm-sim-balance-updated", {
          deviceId,
          simId: updatedSim.id,
          slotIndex: updatedSim.slotIndex,
          airtimeBalance: updatedSim.airtimeBalance,
          dataBalance: updatedSim.dataBalance,
          expiryDate: updatedSim.expiryDate,
          sim: updatedSim,
        });
      }
    } else if (failedStates.includes(normalizedStatus)) {
      command = await markCommandFailed({
        reference,
        message: finalMessage || "Command failed",
      });
    }

    return res.json({
      success: true,
      command,
      sim: updatedSim,
    });
  } catch (error) {
    console.error("receiveCommandResult error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// 22. updateSimNumber
exports.updateSimNumber = async (req, res) => {
  try {
    const { simId } = req.params;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const updatedSim = await prisma.gsmSim.update({
      where: { id: simId },
      data: { 
        phoneNumber: String(phoneNumber).trim(),
        lastSyncAt: new Date(),
      },
    });

    emitEvent("gsm-sim-number-updated", {
      simId: updatedSim.id,
      deviceId: updatedSim.deviceId,
      phoneNumber: updatedSim.phoneNumber,
      sim: updatedSim,
    });

    return res.json({
      success: true,
      message: "SIM phone number updated successfully",
      sim: updatedSim,
    });
  } catch (error) {
    console.error("updateSimNumber error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// 23. getGsmAnalytics (Gyara anan)
exports.getGsmAnalytics = async (req, res) => {
  try {
    const totalDevices = await prisma.gsmDevice.count();
    const onlineDevices = await prisma.gsmDevice.count({ where: { status: "ONLINE" } });
    const offlineDevices = await prisma.gsmDevice.count({ where: { status: "OFFLINE" } });
    
    const totalSims = await prisma.gsmSim.count();
    const totalSms = await prisma.smsInbox.count();
    const totalCommands = await prisma.gsmCommand.count();
    
    // Ka tabbata ka yi amfani da madaidaicin matsayi (status) ɗin da ke cikin schema ɗinka kawai:
    const successfulCommands = await prisma.gsmCommand.count({ 
      where: { status: "SUCCESS" } // Ko kuma duk abin da enum ɗinka ya amince da shi misali "COMPLETED"
    });
    
    const failedCommands = await prisma.gsmCommand.count({ 
      where: { status: "FAILED" } 
    });

    return res.json({
      success: true,
      analytics: {
        totalDevices,
        onlineDevices,
        offlineDevices,
        totalSims,
        totalSms,
        totalCommands,
        successfulCommands,
        failedCommands,
      },
    });
  } catch (error) {
    console.error("getGsmAnalytics error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};