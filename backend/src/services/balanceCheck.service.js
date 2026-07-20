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
  const name = value.toUpperCase();

  if (name.includes("MTN")) return "MTN";
  if (name.includes("AIRTEL")) return "AIRTEL";
  if (name.includes("GLO")) return "GLO";
  if (name.includes("9MOBILE") || name.includes("ETISALAT")) {
    return "9MOBILE";
  }

  return "MTN";
}

async function sendBalanceCheckCommand({ device, sim, type }) {
  const network = normalizeNetwork(
    sim.carrierName || sim.displayName || ""
  );

  const commandType = type === "DATA" ? "DATA" : "AIRTIME";
  const ussdCode =
    NETWORK_CODES[network]?.[commandType] || "*310#";

  const reference =
    `USSD-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  const command = await prisma.gsmCommand.create({
    data: {
      reference,
      deviceId: device.id,
      type: "USSD",
      status: "PENDING",
      payload: {
        simId: sim.id,
        simSlot: sim.slotIndex,
        ussdCode,
        balanceType: commandType,
      },
    },
  });

  emitEvent(
    "gateway-command",
    {
      reference,
      type: "USSD",
      ussdCode,
      simSlot: sim.slotIndex,
    },
    device.id
  );

  return command;
}

module.exports = {
  sendBalanceCheckCommand,
};