const prisma = require("../config/prisma");
const crypto = require("crypto");
const { emitEvent } = require("../config/socket");

const NETWORK_CODES = {
  MTN: {
    AIRTIME: "*310#",
    DATA: "*323#",
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

  const ussdCode =
    NETWORK_CODES[network]?.[normalizedType] ||
    (normalizedType === "DATA"
      ? "*323#"
      : "*310#");

  const reference =
    `USSD-${crypto
      .randomBytes(6)
      .toString("hex")
      .toUpperCase()}`;

  const payload = {
    simId: sim.id,
    simSlot,
    ussdCode,
    network,
    service,
    balanceType: normalizedType,
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
      reference,
      type: "USSD",
      ussdCode,
      simSlot,
      simId: sim.id,
      network,
      service,
      balanceType: normalizedType,
    },
    device.id
  );

  console.log("BALANCE COMMAND SENT:", {
    reference,
    deviceId: device.id,
    simId: sim.id,
    simSlot,
    network,
    service,
    ussdCode,
  });

  return command;
}

module.exports = {
  sendBalanceCheckCommand,
};