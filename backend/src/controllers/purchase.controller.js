const prisma = require("../config/prisma");
const generateReference = require("../utils/generateReference");
const { findBestSim } = require("../services/gsm.service");
const { emitEvent } = require("../config/socket");

exports.buyApiPlan = async (req, res) => {
  try {
    const { planId, phone, phoneNumber, planCode } = req.body;
    const targetPhone = String(phoneNumber || phone || "").trim();

    // 1. Nemo Plan
    let plan = null;
    if (planId) {
      plan = await prisma.apiPlan.findUnique({ where: { id: planId } });
    } else if (planCode) {
      plan = await prisma.apiPlan.findFirst({
        where: {
          OR: [{ planCode: String(planCode) }, { code: String(planCode) }],
        },
      });
    }

    if (!plan || plan.status !== "ACTIVE") {
      // Idan babu shi a teburin apiPlan, bincika a servicePlan
      plan = await prisma.servicePlan.findFirst({
        where: {
          OR: [{ planCode: String(planCode || planId) }, { id: planId || "" }],
        },
      });
    }

    const costPrice = Number(plan?.costPrice || plan?.price || 0);
    const sellingPrice = Number(plan?.sellingPrice || plan?.price || 0);
    const planName = plan?.name || `${planCode || "Data"} Plan`;
    const provider = String(plan?.provider || plan?.network || "MTN").toUpperCase();

    // 2. Nemo Online GSM Device & SIM
    const activeDevice = await prisma.gsmDevice.findFirst({
      where: { status: "ONLINE" },
      include: { sims: true },
      orderBy: { lastSeen: "desc" },
    });

    const sim = await findBestSim({
      type: "DATA",
      network: provider,
      minBalance: 0,
    }).catch(() => null);

    const targetSim =
      sim ||
      activeDevice?.sims?.find((s) =>
        s.carrierName?.toUpperCase().includes(provider)
      ) ||
      activeDevice?.sims?.[0];

    const slotIndex = targetSim?.slotIndex ?? targetSim?.slot ?? 1;
    const deviceId = activeDevice?.id || targetSim?.deviceId;

    // 3. Tace USSD Data Payload
    let raw = String(plan?.planCode || planCode || "1000").toUpperCase();
    let numericSize = "1000";
    if (raw.includes("500")) numericSize = "500";
    else if (raw.includes("1GB") || raw.includes("1000")) numericSize = "1000";
    else if (raw.includes("2GB") || raw.includes("2000")) numericSize = "2000";
    else if (raw.includes("3GB") || raw.includes("3000")) numericSize = "3000";
    else if (raw.includes("5GB") || raw.includes("5000")) numericSize = "5000";
    else {
      numericSize = raw.replace(/[^0-9]/g, "") || "1000";
    }

    const reference = generateReference("DATA");
    const ussdCode = `*312*${targetPhone}*${numericSize}*1997#`;
    const steps = [targetPhone, numericSize, "1997"];

    // 4. Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Sabunta Wallet idan user yana nan
      if (req.user?.id) {
        await tx.wallet.updateMany({
          where: { userId: req.user.id },
          data: { balance: { decrement: sellingPrice } },
        });
      }

      // Ajiye Transaction
      const transaction = await tx.transaction.create({
        data: {
          reference,
          userId: req.user?.id || "DIRECT_API",
          type: "DEBIT",
          service: "DATA",
          amount: sellingPrice,
          status: "SUCCESSFUL",
          description: `${planName} for ${targetPhone} via SIM Slot ${slotIndex}`,
        },
      });

      return { transaction, plan };
    });

    // 5. TURA UMURNI ZUWA WAYAR GSM GATEWAY (Socket & DB Dispatch)
    const commandPayload = {
      reference,
      deviceId,
      type: "USSD",
      ussdCode,
      code: ussdCode,
      steps,
      phoneNumber: targetPhone,
      slotIndex: Number(slotIndex),
      simSlot: Number(slotIndex),
      amount: sellingPrice,
      network: provider,
    };

    if (deviceId) {
      await prisma.gsmCommand.create({
        data: {
          reference,
          deviceId,
          type: "USSD",
          status: "PENDING",
          payload: commandPayload,
        },
      }).catch(() => {});

      const eventPayload = {
        commandId: reference,
        id: reference,
        reference,
        type: "USSD",
        payload: commandPayload,
        ussdCode,
        code: ussdCode,
        steps,
        phoneNumber: targetPhone,
        slotIndex: Number(slotIndex),
        simSlot: Number(slotIndex),
      };

      emitEvent("gateway-command", eventPayload, deviceId);
      emitEvent("command", eventPayload, deviceId);
      emitEvent(`gateway-command-${deviceId}`, eventPayload);
    }

    return res.status(200).json({
      success: true,
      message: "Data purchase command dispatched to GSM Gateway successfully",
      reference,
      data: result,
    });
  } catch (error) {
    console.error("buyApiPlan Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};