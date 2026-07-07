const prisma = require("../config/prisma");
const crypto = require("crypto");
const { emitEvent } = require("../config/socket");

exports.sendSmsCommand = async (req, res) => {
  try {
    const { deviceId, phoneNumber, message } = req.body;

    if (!deviceId || !phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: "deviceId, phoneNumber and message are required",
      });
    }

    const reference =
      "SMS-" + crypto.randomBytes(6).toString("hex").toUpperCase();

    const command = await prisma.gsmCommand.create({
      data: {
        reference,
        deviceId,
        type: "SEND_SMS",
        payload: {
          phoneNumber,
          message,
        },
      },
    });

    // Send only to the selected Android device
    emitEvent(
      "gateway-command",
      {
        reference,
        type: "SEND_SMS",
        phoneNumber,
        message,
      },
      deviceId
    );

    return res.status(201).json({
      success: true,
      message: "SMS command queued successfully",
      command,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.sendUssdCommand = async (req, res) => {
  try {
    const { deviceId, ussdCode } = req.body;

    if (!deviceId || !ussdCode) {
      return res.status(400).json({
        success: false,
        message: "deviceId and ussdCode are required",
      });
    }

    const reference =
      "USSD-" + crypto.randomBytes(6).toString("hex").toUpperCase();

    const command = await prisma.gsmCommand.create({
      data: {
        reference,
        deviceId,
        type: "USSD",
        payload: {
          ussdCode,
        },
      },
    });

    // Send only to the selected Android device
    emitEvent(
      "gateway-command",
      {
        reference,
        type: "USSD",
        ussdCode,
      },
      deviceId
    );

    return res.status(201).json({
      success: true,
      message: "USSD command queued successfully",
      command,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
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

    return res.json({
      success: true,
      commands,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};