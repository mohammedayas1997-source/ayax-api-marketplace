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

const parseExpiryValue = (expiryValue) => {
  if (!expiryValue) {
    return null;
  }

  if (expiryValue instanceof Date) {
    return Number.isNaN(expiryValue.getTime())
      ? null
      : expiryValue;
  }

  const rawExpiry =
    String(expiryValue).trim();

  const dayFirstMatch =
    rawExpiry.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/
    );

  if (dayFirstMatch) {
    const day =
      Number(dayFirstMatch[1]);

    const month =
      Number(dayFirstMatch[2]);

    let year =
      Number(dayFirstMatch[3]);

    if (year < 100) {
      year += 2000;
    }

    const result = new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

    return Number.isNaN(result.getTime())
      ? null
      : result;
  }

  const parsedDate =
    new Date(rawExpiry);

  return Number.isNaN(parsedDate.getTime())
    ? null
    : parsedDate;
};

const parseDataBalanceSms = (message = "") => {
  const text = String(message).replace(/\s+/g, " ").trim();

  const bundleRegex =
    /([A-Za-z][A-Za-z0-9\s_-]{1,40}?)\s*:\s*([\d,.]+)\s*(KB|MB|GB|TB)/gi;

  const bundles = [];
  let match;

  while ((match = bundleRegex.exec(text)) !== null) {
    const name = match[1].trim();
    const amount = Number(match[2].replace(/,/g, ""));
    const unit = match[3].toUpperCase();

    if (!Number.isNaN(amount)) {
      bundles.push({
        name,
        amount,
        unit,
      });
    }
  }

  // Fallback idan sakon bai ƙunshi bundle name ba.
  if (bundles.length === 0) {
    const simpleRegex = /([\d,.]+)\s*(KB|MB|GB|TB)/gi;

    while ((match = simpleRegex.exec(text)) !== null) {
      const amount = Number(match[1].replace(/,/g, ""));
      const unit = match[2].toUpperCase();

      if (!Number.isNaN(amount)) {
        bundles.push({
          name: "Data Balance",
          amount,
          unit,
        });
      }
    }
  }

  if (bundles.length === 0) {
    return null;
  }

  const toMb = ({ amount, unit }) => {
    if (unit === "KB") return amount / 1024;
    if (unit === "GB") return amount * 1024;
    if (unit === "TB") return amount * 1024 * 1024;

    return amount;
  };

  const totalMb = bundles.reduce(
    (sum, bundle) => sum + toMb(bundle),
    0
  );

  const total =
    totalMb >= 1024
      ? `${(totalMb / 1024).toFixed(2)}GB`
      : `${totalMb.toFixed(2)}MB`;

  const breakdown = bundles
    .map(
      (bundle) =>
        `${bundle.name}: ${bundle.amount}${bundle.unit}`
    )
    .join(" | ");

  return {
    total,
    breakdown,
    displayValue: `${total} (${breakdown})`,
  };
};

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
    include:{
        sims:{
            orderBy:{
                slotIndex:"asc"
            }
        }
    },
    orderBy:{
        createdAt:"desc"
    }
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
        message:
          "deviceId, secretKey and message are required",
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

    const parsedData = parseDataBalanceSms(message);

    let updatedSim = null;

    if (
      parsedData &&
      slotIndex !== undefined &&
      slotIndex !== null
    ) {
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
          updatedSim = await prisma.gsmSim.update({
            where: {
              id: sim.id,
            },
            data: {
              dataBalance: parsedData.displayValue,
              lastSyncAt: new Date(),
            },
          });

          emitEvent("gsm-sims-synced", {
            deviceId,
            sims: [updatedSim],
          });

          emitEvent("gsm-sim-balance-updated", {
            deviceId,
            simId: updatedSim.id,
            slotIndex: normalizedSlot,
            dataBalance: parsedData.displayValue,
          });
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
        ? "SMS received and data balance updated"
        : "SMS received successfully",
      sms,
      dataBalance: parsedData,
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
          carrierName:
            sim.carrierName ||
            sim.displayName ||
            "Unknown",

          displayName:
            sim.displayName ||
            sim.carrierName ||
            "Unknown",

          phoneNumber:
            sim.phoneNumber ||
            sim.number ||
            null,

          countryIso:
            sim.countryIso || null,

          mcc:
            sim.mcc === null ||
            sim.mcc === undefined ||
            sim.mcc === ""
              ? null
              : Number(sim.mcc),

          mnc:
            sim.mnc === null ||
            sim.mnc === undefined ||
            sim.mnc === ""
              ? null
              : Number(sim.mnc),

          status: "ACTIVE",
          lastSyncAt: new Date(),
        },
        create: {
          deviceId,
          slotIndex,

          carrierName:
            sim.carrierName ||
            sim.displayName ||
            "Unknown",

          displayName:
            sim.displayName ||
            sim.carrierName ||
            "Unknown",

          phoneNumber:
            sim.phoneNumber ||
            sim.number ||
            null,

          countryIso:
            sim.countryIso || null,

          mcc:
            sim.mcc === null ||
            sim.mcc === undefined ||
            sim.mcc === ""
              ? null
              : Number(sim.mcc),

          mnc:
            sim.mnc === null ||
            sim.mnc === undefined ||
            sim.mnc === ""
              ? null
              : Number(sim.mnc),

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

    console.log("GATEWAY RESULT RECEIVED:", {
      deviceId,
      reference,
      status,
      message,
      response,
    });

    console.log("==========================");
    console.log("RAW MESSAGE:");
    console.log(finalMessage);
    console.log("==========================");

    if (!deviceId || !secretKey || !reference || !status) {
      return res.status(400).json({
        success: false,
        message:
          "deviceId, secretKey, reference and status are required",
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

    const normalizedStatus = String(status).toUpperCase();

    const finalMessage = String(
      message || response || normalizedStatus || ""
    ).trim();

    let command = null;
    let updatedSim = null;

    if (
      normalizedStatus === "PROCESSING" ||
      normalizedStatus === "SENT"
    ) {
      command = await markCommandProcessing({
        reference,
        message: finalMessage,
      });
    } else if (
      normalizedStatus === "SUCCESSFUL" ||
      normalizedStatus === "DELIVERED"
    ) {
      command = await markCommandSuccessful({
        reference,
        message: finalMessage,
      });

      const payload = command?.payload || {};
      const simId = payload.simId || null;

      const balanceType = String(
        payload.balanceType ||
          payload.service ||
          ""
      ).toUpperCase();

      const isAirtimeCommand =
        balanceType === "AIRTIME" ||
        balanceType === "AIRTIME_BALANCE";

      const isDataCommand =
        balanceType === "DATA" ||
        balanceType === "DATA_BALANCE";

      console.log("BALANCE COMMAND PAYLOAD:", {
        reference,
        simId,
        balanceType,
        payload,
        finalMessage,
      });

      if (simId && (isAirtimeCommand || isDataCommand)) {
        const updateData = {
          lastBalanceCheck: new Date(),
          lastSyncAt: new Date(),
        };

        let airtimeBalance = null;
        let dataBalance = null;
        let expiryValue = null;

        if (isAirtimeCommand) {
          airtimeBalance =
            parseAirtimeBalance(finalMessage);

          if (airtimeBalance !== null) {
            updateData.airtimeBalance =
              Number(airtimeBalance);
          }
        }

        if (isDataCommand) {

    const smsBalance = parseDataBalanceSms(finalMessage);

    if (smsBalance) {

        updateData.dataBalance = smsBalance.displayValue;

    } else {

        dataBalance = parseDataBalance(finalMessage);

        if (dataBalance !== null) {
            updateData.dataBalance = String(dataBalance);
        }

    }

}

        expiryValue =
          parseExpiryDate(finalMessage);

        if (expiryValue) {
          const parsedExpiry =
            parseExpiryValue(expiryValue);

          if (parsedExpiry) {
            updateData.expiryDate =
              parsedExpiry;
          }
        }

        console.log("USSD RAW MESSAGE:");
        console.log(finalMessage);
        console.log("--------------------");

        console.log("PARSED BALANCE RESULT:", {
          airtimeBalance,
          dataBalance,
          expiryValue,
          updateData,
        });

        const hasParsedBalance =
          updateData.airtimeBalance !== undefined ||
          updateData.dataBalance !== undefined ||
          updateData.expiryDate !== undefined;

        if (hasParsedBalance) {
          updatedSim = await prisma.gsmSim.update({
            where: {
              id: simId,
            },
            data: updateData,
          });

          emitEvent("gsm-sim-balance-updated", {
            deviceId,
            simId,
            balanceType,
            airtimeBalance:
              updatedSim.airtimeBalance,
            dataBalance:
              updatedSim.dataBalance,
            expiryDate:
              updatedSim.expiryDate,
            sim: updatedSim,
          });

          emitEvent("gsm-sims-synced", {
            deviceId,
            sims: [updatedSim],
          });
        } else {
          console.log(
            "No balance value parsed from response:",
            finalMessage
          );
        }
      }
    } else {
      command = await markCommandFailed({
        reference,
        message:
          finalMessage ||
          normalizedStatus ||
          "Command failed",
      });
    }

    await prisma.gsmDevice.update({
      where: {
        id: deviceId,
      },
      data: {
        status: "ONLINE",
        lastSeen: new Date(),
      },
    });

    return res.json({
      success: true,
      message: updatedSim
        ? "Command result received and SIM balance updated"
        : "Command result received",
      command,
      sim: updatedSim,
    });
  } catch (error) {
    console.error(
      "receiveCommandResult error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Unable to process command result",
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
exports.updateSimNumber = async (req, res) => {
  try {
    const { simId } = req.params;
    const { phoneNumber } = req.body;

    const sim = await prisma.gsmSim.update({
      where: { id: simId },
      data: {
        phoneNumber: phoneNumber?.trim() || null,
      },
    });

   emitEvent("gsm-sim-balance-updated", {
  deviceId: sim.deviceId,
  sim,
});

    return res.json({
      success: true,
      message: "SIM number updated",
      sim,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};