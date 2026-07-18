const prisma = require("../config/prisma");
const crypto = require("crypto");
const { emitEvent } = require("../config/socket");

const buildReference = (prefix) =>
  `${prefix}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

const getSelectedSim = async ({ deviceId, simId, simSlot }) => {
  if (simId) {
    const sim = await prisma.gsmSim.findFirst({
      where: {
        id: simId,
        deviceId,
      },
    });

    if (!sim) {
      throw new Error("Selected SIM was not found on this gateway device");
    }

    return sim;
  }

  if (simSlot !== undefined && simSlot !== null) {
    const sim = await prisma.gsmSim.findFirst({
      where: {
        deviceId,
        slotIndex: Number(simSlot),
      },
    });

    if (!sim) {
      throw new Error(
        `SIM slot ${Number(simSlot) + 1} was not found on this gateway device`
      );
    }

    return sim;
  }

  const fallbackSim = await prisma.gsmSim.findFirst({
    where: {
      deviceId,
      status: "ACTIVE",
    },
    orderBy: {
      slotIndex: "asc",
    },
  });

  if (!fallbackSim) {
    throw new Error("No active SIM is available on this gateway device");
  }

  return fallbackSim;
};

const getGatewayDevice = async (deviceId) => {
  const device = await prisma.gsmDevice.findUnique({
    where: {
      id: deviceId,
    },
  });

  if (!device) {
    throw new Error("Gateway device not found");
  }

  if (device.status !== "ONLINE") {
    throw new Error("Gateway device is currently offline");
  }

  return device;
};

exports.sendSmsCommand = async (req, res) => {
  try {
    const {
      deviceId,
      simId,
      simSlot,
      phoneNumber,
      message,
    } = req.body;

    if (!deviceId || !phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: "deviceId, phoneNumber and message are required",
      });
    }

    const device = await getGatewayDevice(deviceId);

    const sim = await getSelectedSim({
      deviceId,
      simId,
      simSlot,
    });

    const reference = buildReference("SMS");

    const payload = {
      simId: sim.id,
      simSlot: sim.slotIndex,
      carrierName: sim.carrierName,
      phoneNumber: String(phoneNumber).trim(),
      message: String(message).trim(),
    };

    const command = await prisma.gsmCommand.create({
      data: {
        reference,
        deviceId: device.id,
        type: "SEND_SMS",
        status: "PENDING",
        payload,
      },
      include: {
        device: true,
      },
    });

    emitEvent(
      "gateway-command",
      {
        reference,
        type: "SEND_SMS",
        deviceId: device.id,
        simId: sim.id,
        simSlot: sim.slotIndex,
        phoneNumber: payload.phoneNumber,
        message: payload.message,
        payload,
      },
      device.id
    );

    emitEvent("gsm-command-updated", {
      command,
    });

    return res.status(201).json({
      success: true,
      message: `SMS command queued through SIM ${
        Number(sim.slotIndex) + 1
      }`,
      command,
      sim,
    });
  } catch (error) {
    console.error("sendSmsCommand error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.sendUssdCommand = async (req, res) => {
  try {
    const {
      deviceId,
      simId,
      simSlot,
      ussdCode,
    } = req.body;

    if (!deviceId || !ussdCode) {
      return res.status(400).json({
        success: false,
        message: "deviceId and ussdCode are required",
      });
    }

    const device = await getGatewayDevice(deviceId);

    const sim = await getSelectedSim({
      deviceId,
      simId,
      simSlot,
    });

    const reference = buildReference("USSD");

    const payload = {
      simId: sim.id,
      simSlot: sim.slotIndex,
      carrierName: sim.carrierName,
      ussdCode: String(ussdCode).trim(),
      service: "MANUAL_USSD",
    };

    const command = await prisma.gsmCommand.create({
      data: {
        reference,
        deviceId: device.id,
        type: "USSD",
        status: "PENDING",
        payload,
      },
      include: {
        device: true,
      },
    });

    emitEvent(
      "gateway-command",
      {
        reference,
        type: "USSD",
        deviceId: device.id,
        simId: sim.id,
        simSlot: sim.slotIndex,
        ussdCode: payload.ussdCode,
        payload,
      },
      device.id
    );

    emitEvent("gsm-command-updated", {
      command,
    });

    return res.status(201).json({
      success: true,
      message: `USSD command queued through SIM ${
        Number(sim.slotIndex) + 1
      }`,
      command,
      sim,
    });
  } catch (error) {
    console.error("sendUssdCommand error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCommands = async (req, res) => {
  try {
    const commands = await prisma.gsmCommand.findMany({
      include: {
        device: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const normalizedCommands = commands.map((command) => ({
      ...command,
      simId: command.payload?.simId || null,
      simSlot:
        command.payload?.simSlot === undefined
          ? null
          : command.payload.simSlot,
      phoneNumber: command.payload?.phoneNumber || null,
      ussdCode: command.payload?.ussdCode || null,
      service: command.payload?.service || null,
    }));

    return res.json({
      success: true,
      commands: normalizedCommands,
    });
  } catch (error) {
    console.error("getCommands error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};