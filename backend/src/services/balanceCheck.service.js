const prisma = require("../config/prisma");
const crypto = require("crypto");
const { emitEvent } = require("../config/socket");

const MOMO_PIN = "1997"; // Sanya 4-digit PIN din MoMo na layinka

const NETWORK_CODES = {
  MTN: {
    AIRTIME: `*671*5*${MOMO_PIN}#`, // MoMo Wallet Balance Check
    DATA: "DATABAL",                 // SMS zuwa 131 domin MTN SME Data
  },
  AIRTEL: {
    AIRTIME: "*310#",
    DATA: "*323#",
  },
  GLO: {
    AIRTIME: "*310#",
    DATA: "*323#",
  },
  "9MOBILE": {
    AIRTIME: "*310#",
    DATA: "*323#",
  },
};

const NUMBER_CHECK_CODES = {
  MTN: "*667#",
  AIRTEL: "*121*3*4#",
  GLO: "*135*8#",
  "9MOBILE": "*248#",
};

function normalizeNetwork(value = "") {
  const name = String(value).trim().toUpperCase();

  if (name.includes("MTN")) return "MTN";
  if (name.includes("AIRTEL")) return "AIRTEL";
  if (name.includes("GLO")) return "GLO";

  if (
    name.includes("9MOBILE") ||
    name.includes("ETISALAT")
  ) {
    return "9MOBILE";
  }

  return "MTN";
}

function normalizeSimSlot(value) {
  const slot = Number(value);

  if (!Number.isInteger(slot) || slot < 0) {
    throw new Error("Invalid SIM slot");
  }

  return slot;
}

async function sendBalanceCheckCommand({
  device,
  sim,
  type = "AIRTIME",
}) {
  if (!device?.id) {
    throw new Error("Gateway device is required");
  }

  if (!sim?.id) {
    throw new Error("SIM is required");
  }

  const simSlot = normalizeSimSlot(sim.slotIndex);

  const network = normalizeNetwork(
    sim.carrierName ||
      sim.displayName ||
      ""
  );

  const normalizedType =
    String(type).trim().toUpperCase() === "DATA"
      ? "DATA"
      : "AIRTIME";

  const service =
    normalizedType === "DATA"
      ? "DATA_BALANCE"
      : "AIRTIME_BALANCE";

  const isMtnSmeData = network === "MTN" && normalizedType === "DATA";

  let commandType = isMtnSmeData ? "SEND_SMS" : "USSD";
  let ussdCode = null;
  let smsRecipient = null;
  let smsMessage = null;

  if (isMtnSmeData) {
    // 1. Duba SME Data Balance ta hanyar SMS zuwa 131
    smsRecipient = "131";
    smsMessage = "DATABAL";
  } else {
    // 2. Duba MoMo Wallet Balance ta hanyar USSD
    ussdCode =
      NETWORK_CODES[network]?.[normalizedType] ||
      (normalizedType === "DATA" ? "*323#" : `*671*5*${MOMO_PIN}#`);
  }

  const reference = `${commandType === "SEND_SMS" ? "SMS" : "USSD"}-${crypto
    .randomBytes(6)
    .toString("hex")
    .toUpperCase()}`;

  const payload = {
    simId: sim.id,
    simSlot,
    network,
    service,
    balanceType: normalizedType,
    ...(commandType === "USSD" && {
      ussdCode,
      ussd: ussdCode,
      code: ussdCode,
      steps: ["5", MOMO_PIN],
    }),
    ...(commandType === "SEND_SMS" && {
      phoneNumber: smsRecipient,
      recipient: smsRecipient,
      message: smsMessage,
      smsText: smsMessage,
    }),
  };

  const command = await prisma.gsmCommand.create({
    data: {
      reference,
      deviceId: device.id,
      type: commandType,
      status: "PENDING",
      payload,
    },
  });

  emitEvent(
    "gateway-command",
    {
      commandId: command.id,
      reference,
      type: commandType,
      payload,
      simSlot,
      simId: sim.id,
      network,
      service,
      balanceType: normalizedType,
      ...(commandType === "USSD" && { ussdCode }),
      ...(commandType === "SEND_SMS" && {
        phoneNumber: smsRecipient,
        message: smsMessage,
      }),
    },
    device.id
  );

  console.log("BALANCE COMMAND SENT:", {
    reference,
    type: commandType,
    deviceId: device.id,
    simId: sim.id,
    simSlot,
    network,
    service,
    ussdCode,
    smsMessage,
  });

  return command;
}

async function sendNumberCheckCommand({ device, sim }) {
  if (!device?.id) {
    throw new Error("Gateway device is required");
  }

  if (!sim?.id) {
    throw new Error("SIM is required");
  }

  const simSlot = normalizeSimSlot(sim.slotIndex);
  const network = normalizeNetwork(
    sim.carrierName ||
      sim.displayName ||
      ""
  );

  const ussdCode = NUMBER_CHECK_CODES[network] || "*667#";
  const reference = `NUM-${crypto
    .randomBytes(6)
    .toString("hex")
    .toUpperCase()}`;

  const payload = {
    simId: sim.id,
    simSlot,
    network,
    service: "PHONE_NUMBER_CHECK",
    balanceType: "PHONE_NUMBER",
    ussdCode,
    ussd: ussdCode,
    code: ussdCode,
  };

  const command = await prisma.gsmCommand.create({
    data: {
      reference,
      deviceId: device.id,
      type: "USSD",
      status: "PENDING",
      payload,
    },
  });

  emitEvent(
    "gateway-command",
    {
      commandId: command.id,
      reference,
      type: "USSD",
      payload,
      simSlot,
      simId: sim.id,
      network,
      service: "PHONE_NUMBER_CHECK",
      balanceType: "PHONE_NUMBER",
      ussdCode,
    },
    device.id
  );

  console.log("NUMBER CHECK COMMAND SENT:", {
    reference,
    deviceId: device.id,
    simId: sim.id,
    simSlot,
    network,
    ussdCode,
  });

  return command;
}

module.exports = {
  sendBalanceCheckCommand,
  sendNumberCheckCommand,
};