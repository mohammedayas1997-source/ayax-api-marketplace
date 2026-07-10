const crypto = require("crypto");
const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");
const { getNetworkProfile } = require("./networkProfile.service");

exports.sendBalanceCheckCommand = async ({ device, sim, type = "AIRTIME" }) => {
  const network = String(sim.carrierName || "").toUpperCase();

  const profile = await getNetworkProfile(network.includes("MTN") ? "MTN" : network);

  const ussdCode =
    type === "DATA" ? profile.dataBalanceUssd : profile.balanceUssd;

  if (!ussdCode) {
    throw new Error(`${type} balance USSD not configured for ${network}`);
  }

  const reference =
    `${type}-BAL-` + crypto.randomBytes(6).toString("hex").toUpperCase();

  const command = await prisma.gsmCommand.create({
    data: {
      reference,
      deviceId: device.id,
      type: "USSD",
      status: "PENDING",
      payload: {
        simId: sim.id,
        simSlot: sim.slotIndex,
        network,
        service: `${type}_BALANCE`,
        ussdCode,
      },
    },
  });

  emitEvent(
    "gateway-command",
    {
      reference,
      type: "USSD",
      simSlot: sim.slotIndex,
      ussdCode,
    },
    device.id
  );

  return command;
};