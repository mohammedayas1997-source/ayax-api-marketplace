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
  parsePhoneNumber,
  parseTransactionFeedback,
} = require("../services/ussdParser.service");
const {
  sendBalanceCheckCommand,
  sendNumberCheckCommand,
} = require("../services/balanceCheck.service");

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

  if (text.includes("T") && !Number.isNaN(new Date(text).getTime())) {
    return new Date(text);
  }

  const dmyMatch = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    const [, day, month, rawYear] = dmyMatch;
    const year = rawYear.length === 2 ? Number(`20${rawYear}`) : Number(rawYear);
    const date = new Date(year, Number(month) - 1, Number(day), 23, 59, 59);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dMonYMatch = text.match(/^(\d{1,2})[\s\-]+([A-Za-z]{3,9})[\s\-]+(\d{2,4})/);
  if (dMonYMatch) {
    const [, day, monthName, rawYear] = dMonYMatch;
    const month = MONTHS[monthName.toLowerCase()];
    if (month !== undefined) {
      const year = rawYear.length === 2 ? Number(`20${rawYear}`) : Number(rawYear);
      const date = new Date(year, month, Number(day), 23, 59, 59);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const ymdMatch = text.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const directDate = new Date(text);
  return Number.isNaN(directDate.getTime()) ? null : directDate;
};

// Helper na mayar wa mai amfani da kudi idan oda ta fadi (Auto-Refund)
const refundUserTransactionByRef = async (reference, reason) => {
  try {
    const txn = await prisma.transaction.findFirst({
      where: { reference },
    });

    if (txn && txn.status !== "FAILED" && txn.status !== "REFUNDED" && txn.status !== "SUCCESSFUL") {
      const refundAmount = Number(txn.amount);

      await prisma.$transaction([
        prisma.wallet.updateMany({
          where: { userId: txn.userId },
          data: { balance: { increment: refundAmount } },
        }),
        prisma.transaction.update({
          where: { id: txn.id },
          data: {
            status: "FAILED",
            description: `Refunded (₦${refundAmount}): ${reason || "Delivery failure"}`,
          },
        }),
      ]);

      emitEvent("wallet-updated", {
        userId: txn.userId,
        refundedAmount: refundAmount,
        reference,
      });

      console.log(`💸 [AUTO-REFUND SUCCESS]: ₦${refundAmount} refunded for Ref: ${reference} (${reason})`);
    }
  } catch (refundErr) {
    console.error("Auto-refund error:", refundErr.message);
  }
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

    if (!deviceId || !secretKey) {
      return res.status(400).json({
        success: false,
        message: "deviceId and secretKey are required",
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

    const updated = await prisma.gsmDevice.update({
      where: { id: deviceId },
      data: {
        battery: battery !== undefined ? Number(battery) : undefined,
        charging: charging !== undefined ? Boolean(charging) : undefined,
        signal: signal !== undefined ? Number(signal) : undefined,
        internet: internet !== undefined ? Boolean(internet) : undefined,
        status: "ONLINE",
        lastSeen: new Date(),
      },
    });

    // 1. Daga tsoffin ayyukan da suka wuce minti 3 a PROCESSING, yi musu auto-refund
    const staleTime = new Date(Date.now() - 3 * 60 * 1000);
    const staleCommands = await prisma.gsmCommand.findMany({
      where: {
        deviceId,
        status: "PROCESSING",
        createdAt: { lte: staleTime },
      },
      take: 5,
    });

    for (const stale of staleCommands) {
      await prisma.gsmCommand.update({
        where: { id: stale.id },
        data: { status: "FAILED", response: "Command timed out (No response from network)" },
      });
      await refundUserTransactionByRef(stale.reference, "Gateway Timeout: Network failed to respond in 3 minutes");
    }

    // 2. Dauko sabbin ayyukan da ke PENDING
    const pendingCommands = await prisma.gsmCommand.findMany({
      where: {
        OR: [{ deviceId: deviceId }, { deviceId: null }],
        status: "PENDING",
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    });

    if (pendingCommands.length > 0) {
      const ids = pendingCommands.map((c) => c.id);
      await prisma.gsmCommand.updateMany({
        where: { id: { in: ids } },
        data: { status: "PROCESSING" },
      });
    }

    const formattedCommands = pendingCommands.map((cmd) => {
      const payloadData =
        typeof cmd.payload === "string"
          ? JSON.parse(cmd.payload || "{}")
          : cmd.payload || {};

      const smsMessageText =
        payloadData.message ||
        payloadData.smsText ||
        payloadData.smsBody ||
        payloadData.body ||
        "";

      const targetRecipient =
        payloadData.recipient ||
        payloadData.sendTo ||
        payloadData.phoneNumber ||
        payloadData.destination ||
        payloadData.phone ||
        "";

      const isUssd = cmd.type === "USSD" || payloadData.type === "USSD";

      return {
        id: cmd.id,
        commandId: cmd.id,
        reference: cmd.reference,
        type: isUssd ? "USSD" : "SEND_SMS",
        action: isUssd ? "USSD" : "SEND_SMS",
        status: "PROCESSING",

        // USSD
        ussdCode: payloadData.ussdCode || payloadData.code || "",
        code: payloadData.ussdCode || payloadData.code || "",
        steps: payloadData.steps || [],

        // SMS
        message: smsMessageText,
        smsText: smsMessageText,
        smsBody: smsMessageText,
        body: smsMessageText,
        recipient: targetRecipient,
        sendTo: targetRecipient,
        destination: targetRecipient,
        phoneNumber: targetRecipient,
        phone: targetRecipient,
        targetPhone: payloadData.targetPhone || targetRecipient,

        // SIM Slot
        slotIndex: Number(payloadData.slotIndex ?? payloadData.simSlot ?? 0),
        simSlot: Number(payloadData.slotIndex ?? payloadData.simSlot ?? 0),
        simId: payloadData.simId || null,

        amount: Number(payloadData.amount || 0),
        network: payloadData.network || null,
        payload: payloadData,
      };
    });

    emitEvent("gsm-device-heartbeat", { device: updated });

    return res.json({
      success: true,
      message: "Heartbeat received",
      device: updated,
      commands: formattedCommands,
    });
  } catch (error) {
    console.error("Heartbeat processing error:", error.message);
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
          orderBy: { slotIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
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

// 8. receiveIncomingSms (INBOUND SMS FEEDBACK & AUTO-REFUND RECONCILIATION)
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
      where: { id: deviceId, secretKey },
    });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: "Invalid device credentials",
      });
    }

    // 1. Ajiye SMS a smsInbox
    const sms = await prisma.smsInbox.create({
      data: {
        deviceId,
        phoneNumber: phoneNumber || "Unknown",
        message,
      },
    });

    // 2. Duba Feedback na Telco (Success / Fail)
    const lowerMsg = String(message || "").toLowerCase();
    const feedback = parseTransactionFeedback ? parseTransactionFeedback(message) : { status: "UNKNOWN" };
    const detectedPhone = parsePhoneNumber(message);

    const isFailureMessage =
      lowerMsg.includes("incorrect") ||
      lowerMsg.includes("oops") ||
      lowerMsg.includes("not eligible") ||
      lowerMsg.includes("failed") ||
      lowerMsg.includes("insufficient") ||
      lowerMsg.includes("invalid pin") ||
      feedback.status === "FAILED" ||
      feedback.status === "INSUFFICIENT_BALANCE";

    const isSuccessMessage =
      lowerMsg.includes("successful") ||
      lowerMsg.includes("transferred") ||
      lowerMsg.includes("you have gifted") ||
      feedback.status === "SUCCESS";

    // 3. NEMO TRANSACTION: Ko ta lambar waya, ko kuma Transaction na karshe da ke PROCESSING a wannan layin
    let targetCmd = null;

    if (detectedPhone) {
      targetCmd = await prisma.gsmCommand.findFirst({
        where: {
          deviceId,
          status: { in: ["PENDING", "PROCESSING"] },
          payload: { path: ["targetPhone"], equals: detectedPhone },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // IDAN SAKON BAYA DA LAMBAR WAYA A CIKI (Kamar MTN Oops message), DAUKO NA KARSHE A WANNAN LAYIN
    if (!targetCmd && (isFailureMessage || isSuccessMessage)) {
      targetCmd = await prisma.gsmCommand.findFirst({
        where: {
          deviceId,
          status: { in: ["PENDING", "PROCESSING"] },
          createdAt: { gte: new Date(Date.now() - 3 * 60 * 1000) }, // A cikin minti 3 da suka wuce
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (targetCmd) {
      if (isSuccessMessage) {
        await markCommandSuccessful({
          reference: targetCmd.reference,
          message: message.slice(0, 190),
        });
        await prisma.transaction.updateMany({
          where: { reference: targetCmd.reference },
          data: {
            status: "SUCCESSFUL",
            description: `Confirmed via Telco SMS: ${message.slice(0, 180)}`,
          },
        });
        console.log(`✅ [SMS RECONCILED: SUCCESS] Ref: ${targetCmd.reference}`);
      } else if (isFailureMessage) {
        await markCommandFailed({
          reference: targetCmd.reference,
          message: message.slice(0, 190),
        });
        // AUTO-REFUND NAN TAKE
        await refundUserTransactionByRef(targetCmd.reference, message.slice(0, 150));
        console.log(`❌ [SMS RECONCILED: FAILED & REFUNDED] Ref: ${targetCmd.reference}`);
      }
    }

    // 4. Duba Balance idan saƙon duba balance ne
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

          if (parsedDataBalance !== null && parsedDataBalance !== undefined && String(parsedDataBalance).trim() !== "") {
            updateData.dataBalance = String(parsedDataBalance).trim();
          }

          if (parsedAirtimeBalance !== null && parsedAirtimeBalance !== undefined && !Number.isNaN(Number(parsedAirtimeBalance))) {
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
              where: { id: sim.id },
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
      feedbackStatus: feedback.status,
    });

    return res.status(201).json({
      success: true,
      message: "SMS received and processed successfully",
      sms,
      feedbackStatus: feedback.status,
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
      where: { id: deviceId, secretKey },
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
      if (!Number.isInteger(slotIndex) || slotIndex < 0) continue;

      const existingSim = await prisma.gsmSim.findUnique({
        where: {
          deviceId_slotIndex: {
            deviceId,
            slotIndex,
          },
        },
      });

      const incomingPhone = sim.phoneNumber || sim.number;
      let finalPhoneNumber = existingSim?.phoneNumber || null;

      if (incomingPhone && incomingPhone !== "Hidden by Android" && !incomingPhone.includes("Unknown")) {
        finalPhoneNumber = incomingPhone;
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
          phoneNumber: finalPhoneNumber,
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
          phoneNumber: finalPhoneNumber,
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

    return res.json({ success: true, sims });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
    return res.status(400).json({ success: false, message: error.message });
  }
};

// 13. getGatewayDevices
exports.getGatewayDevices = async (req, res) => {
  try {
    const devices = await prisma.gsmDevice.findMany({
      include: {
        sims: {
          orderBy: { slotIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, devices });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 14. updateLocation
exports.updateLocation = async (req, res) => {
  try {
    const { deviceId, secretKey, latitude, longitude, accuracy, speed, bearing } = req.body;

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

    return res.json({ success: true, message: "Location updated" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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
      data: { deviceId, type, message },
      include: { device: true },
    });

    emitEvent("gateway-security-alert", { alert });

    return res.status(201).json({
      success: true,
      message: "Security alert received",
      alert,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// 16. getSecurityAlerts
exports.getSecurityAlerts = async (req, res) => {
  try {
    const alerts = await prisma.gatewaySecurityAlert.findMany({
      include: { device: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return res.json({ success: true, alerts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 17. resolveSecurityAlert
exports.resolveSecurityAlert = async (req, res) => {
  try {
    const alert = await prisma.gatewaySecurityAlert.update({
      where: { id: req.params.id },
      data: { resolved: true },
    });

    emitEvent("gateway-security-alert-resolved", { alert });

    return res.json({ success: true, message: "Alert resolved", alert });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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
    return res.status(400).json({ success: false, message: error.message });
  }
};

// 21. receiveCommandResult (USSD / SMS DELIVERY CONFIRMATION)
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
      const fallbackTxn = await prisma.transaction.findFirst({
        where: { reference },
      });

      if (fallbackTxn) {
        const normStatus = String(status || "").trim().toUpperCase();
        const finalMsg = String(message || response || "").trim();

        if (["SUCCESS", "SUCCESSFUL", "COMPLETED", "DELIVERED"].includes(normStatus)) {
          await prisma.transaction.update({
            where: { id: fallbackTxn.id },
            data: {
              status: "SUCCESSFUL",
              description: finalMsg ? `Completed: ${finalMsg.slice(0, 190)}` : undefined,
            },
          });
        } else if (["FAILED", "FAILURE", "ERROR", "CANCELLED"].includes(normStatus)) {
          await refundUserTransactionByRef(reference, finalMsg || "Gateway rejected");
        }
      }

      return res.status(200).json({
        success: true,
        cleared: true,
        message: "Command result acknowledged and dequeued",
      });
    }

    if (existingCommand.deviceId && existingCommand.deviceId !== deviceId) {
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

    const waitingStates = ["WAITING", "PROCESSING", "PENDING", "SENT"];
    const successStates = ["SUCCESS", "SUCCESSFUL", "COMPLETED", "DELIVERED"];
    const failedStates = ["FAILED", "FAILURE", "ERROR", "CANCELLED"];

    const feedback = parseTransactionFeedback ? parseTransactionFeedback(finalMessage) : { status: "UNKNOWN" };

    const payload = existingCommand.payload || {};
    const simId = payload.simId || req.body.simId || null;
    const balanceType = String(
      payload.balanceType || req.body.balanceType || payload.service || req.body.service || payload.type || req.body.requestType || ""
    ).trim().toUpperCase();

    const isPhoneNumberCommand = balanceType === "PHONE_NUMBER" || balanceType === "PHONE_NUMBER_CHECK" || existingCommand.type === "PHONE_NUMBER_CHECK";
    const isAirtimeCommand = ["AIRTIME", "AIRTIME_BALANCE", "CHECK_AIRTIME"].includes(balanceType);
    const isDataCommand = ["DATA", "DATA_BALANCE", "CHECK_DATA"].includes(balanceType);
    const isBalanceCommand = Boolean(simId) && (isAirtimeCommand || isDataCommand);

    let command = existingCommand;
    let updatedSim = null;

    // Idan saƙon SMS/USSD na Transaction ne (ba Balance check ba)
    if (!isBalanceCommand && !isPhoneNumberCommand) {
      if (successStates.includes(normalizedStatus) || feedback.status === "SUCCESS") {
        command = await markCommandSuccessful({
          reference,
          message: finalMessage || "Delivered successfully",
        });

        await prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "SUCCESSFUL",
            description: finalMessage ? `Completed: ${finalMessage.slice(0, 190)}` : undefined,
          },
        });
      } else if (failedStates.includes(normalizedStatus) || ["FAILED", "INSUFFICIENT_BALANCE", "INVALID_PIN"].includes(feedback.status)) {
        command = await markCommandFailed({
          reference,
          message: finalMessage || "Delivery failed",
        });

        // AUTO-REFUND NAN TAKE
        await refundUserTransactionByRef(reference, finalMessage || feedback.status);
      }

      return res.json({
        success: true,
        command,
      });
    }

    // Bangaren Balance Check (USSD Parsing)
    if (waitingStates.includes(normalizedStatus)) {
      command = await markCommandProcessing({
        reference,
        message: finalMessage || "Processing USSD balance check",
      });

      return res.json({
        success: true,
        pending: true,
        command,
      });
    }

    if (successStates.includes(normalizedStatus)) {
      let airtimeBalance = null;
      let dataBalance = null;
      let expiryValue = null;
      const parsedPhone = parsePhoneNumber(finalMessage);

      if (isAirtimeCommand) {
        airtimeBalance = parseAirtimeBalance(finalMessage);
      }

      if (isDataCommand) {
        const parsedData = parseDataBalance(finalMessage);
        if (parsedData !== null && parsedData !== undefined && String(parsedData).trim() !== "") {
          dataBalance = String(parsedData).trim();
        }
      }

      expiryValue = parseExpiryDate(finalMessage);

      const hasAirtimeBalance = airtimeBalance !== null && !Number.isNaN(Number(airtimeBalance));
      const hasDataBalance = dataBalance !== null && String(dataBalance).trim() !== "";
      const hasPhoneNumber = Boolean(parsedPhone);

      command = await markCommandSuccessful({
        reference,
        message: finalMessage || "USSD executed successfully",
      });

      if (simId) {
        const simUpdateData = { lastSyncAt: new Date() };

        if (hasAirtimeBalance) {
          simUpdateData.airtimeBalance = Number(airtimeBalance);
          simUpdateData.lastBalanceCheck = new Date();
        }

        if (hasDataBalance) {
          simUpdateData.dataBalance = dataBalance;
          simUpdateData.lastBalanceCheck = new Date();
        }

        if (expiryValue) {
          const formattedExpiry = parseExpiryToDate(expiryValue);
          if (formattedExpiry) {
            simUpdateData.expiryDate = formattedExpiry;
          }
        }

        if (hasPhoneNumber) {
          simUpdateData.phoneNumber = parsedPhone;
        }

        updatedSim = await prisma.gsmSim.update({
          where: { id: simId },
          data: simUpdateData,
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
        message: finalMessage || "Balance check failed",
      });
    }

    return res.json({
      success: true,
      command,
      sim: updatedSim,
    });
  } catch (error) {
    console.error("receiveCommandResult error:", error);
    return res.status(200).json({
      success: false,
      message: error.message,
    });
  }
};

// 22. updateSimNumber (Manual Update)
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

// 23. fetchSimPhoneNumber (Automatic USSD Check)
exports.fetchSimPhoneNumber = async (req, res) => {
  try {
    const { simId } = req.body;

    if (!simId) {
      return res.status(400).json({
        success: false,
        message: "simId is required",
      });
    }

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

    const command = await sendNumberCheckCommand({
      device: sim.device,
      sim,
    });

    return res.status(201).json({
      success: true,
      message: "Number check USSD command sent to device",
      command,
    });
  } catch (error) {
    console.error("fetchSimPhoneNumber error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// 24. getGsmAnalytics
exports.getGsmAnalytics = async (req, res) => {
  try {
    const totalDevices = await prisma.gsmDevice.count();
    const onlineDevices = await prisma.gsmDevice.count({ where: { status: "ONLINE" } });
    const offlineDevices = await prisma.gsmDevice.count({ where: { status: "OFFLINE" } });

    const totalSims = await prisma.gsmSim.count();
    const totalSms = await prisma.smsInbox.count();
    const totalCommands = await prisma.gsmCommand.count();

    const successfulCommands = await prisma.gsmCommand.count({
      where: { status: "SUCCESSFUL" },
    });

    const failedCommands = await prisma.gsmCommand.count({
      where: { status: "FAILED" },
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