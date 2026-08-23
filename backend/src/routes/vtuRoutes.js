const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const prisma = require("../config/prisma") || require("../lib/prisma");
const { emitEvent, emitGatewayCommand } = require("../config/socket");

router.post("/buy-data", async (req, res) => {
  try {
    const user = req.user;
    const { network, phoneNumber, phone, planCode, amount, transactionPin } = req.body;
    const targetPhone = String(phoneNumber || phone || "").trim();
    const resolvedNetwork = String(network || "MTN").toUpperCase();

    if (!targetPhone || targetPhone.length < 11) {
      return res.status(400).json({
        success: false,
        message: "A valid 11-digit phone number is required.",
      });
    }

    // 1. Tabbatar da Device din Gateway yana ONLINE
    const activeDevice = await prisma.gsmDevice.findFirst({
      where: { status: "ONLINE" },
      include: { sims: true },
      orderBy: { lastSeen: "desc" },
    });

    if (!activeDevice) {
      return res.status(503).json({
        success: false,
        message: "No GSM Gateway device is currently online.",
      });
    }

    // 2. Zaɓi SIM ɗin wannan Network ɗin
    const targetSim =
      activeDevice.sims.find(
        (s) =>
          s.carrierName?.toUpperCase().includes(resolvedNetwork) ||
          s.displayName?.toUpperCase().includes(resolvedNetwork)
      ) || activeDevice.sims[0];

    const slotIndex = targetSim?.slotIndex ?? 0;
    const reference = "DATA-" + crypto.randomBytes(6).toString("hex").toUpperCase();

    // 3. Gina USSD Code (MTN / Airtel / Glo / 9mobile direct syntax)
    let cleanPlanCode = String(planCode || "1000").replace(/[^0-9]/g, "") || "1000";
    let ussdCode = `*312*${targetPhone}*${cleanPlanCode}*1997#`;
    let steps = [targetPhone, cleanPlanCode, "1997"];

    if (resolvedNetwork === "AIRTEL") {
      ussdCode = `*141*${targetPhone}*${cleanPlanCode}#`;
      steps = [targetPhone, cleanPlanCode];
    } else if (resolvedNetwork === "GLO") {
      ussdCode = `*127*${cleanPlanCode}*${targetPhone}#`;
      steps = [cleanPlanCode, targetPhone];
    } else if (resolvedNetwork === "9MOBILE") {
      ussdCode = `*229*${cleanPlanCode}*${targetPhone}#`;
      steps = [cleanPlanCode, targetPhone];
    }

    const commandPayload = {
      reference,
      deviceId: activeDevice.id,
      type: "USSD", // Dole USSD zai zama domin Gateway App ya karba kamar Airtime
      ussdCode,
      code: ussdCode,
      ussd: ussdCode,
      steps,
      phoneNumber: targetPhone,
      phone: targetPhone,
      targetPhone,
      slotIndex,
      simSlot: slotIndex,
      simId: targetSim?.id || null,
      amount: Number(amount || 0),
      network: resolvedNetwork,
    };

    // 4. Ajiye a cikin gsmCommand teburi
    const createdCommand = await prisma.gsmCommand.create({
      data: {
        reference,
        deviceId: activeDevice.id,
        type: "USSD",
        status: "PENDING",
        payload: commandPayload,
      },
    });

    // 5. Watsa ta Socket kamar yadda Airtime yake watsuwa
    const eventPayload = {
      commandId: createdCommand.id,
      id: createdCommand.id,
      reference,
      type: "USSD",
      payload: commandPayload,
      ussdCode,
      code: ussdCode,
      steps,
      phoneNumber: targetPhone,
      slotIndex,
      simSlot: slotIndex,
      carrier: targetSim?.carrierName || resolvedNetwork,
    };

    try {
      emitEvent("gateway-command", eventPayload, activeDevice.id);
      emitEvent("command", eventPayload, activeDevice.id);
      emitEvent(`gateway-command-${activeDevice.id}`, eventPayload);

      if (typeof emitGatewayCommand === "function") {
        emitGatewayCommand(activeDevice.id, eventPayload);
      }
      console.log(`⚡ [APP VTU -> GATEWAY DISPATCHED]: Ref ${reference} -> Device ${activeDevice.id} (${ussdCode})`);
    } catch (sockErr) {
      console.warn("Socket broadcast note:", sockErr.message);
    }

    return res.status(200).json({
      success: true,
      status: "success",
      message: `Data purchase initiated for ${targetPhone}. Processing on GSM Gateway.`,
      reference,
      commandId: createdCommand.id,
    });
  } catch (error) {
    console.error("VTU Buy Data Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;