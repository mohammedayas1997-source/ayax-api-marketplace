const prisma = require("../config/prisma");

exports.findBestDevice = async ({
  network,
  service = "AIRTIME",
}) => {
  // Find all online devices with active SIMs
  const devices = await prisma.gsmDevice.findMany({
    where: {
      status: "ONLINE",
    },
    include: {
      sims: {
        where: {
          status: "ACTIVE",
        },
      },
    },
  });

  if (!devices.length) {
    throw new Error("No online GSM Gateway available.");
  }

  const candidates = [];

  for (const device of devices) {
    for (const sim of device.sims) {
      const carrier =
        (sim.carrierName || "").toUpperCase();

      if (!carrier.includes(network.toUpperCase())) {
        continue;
      }

      candidates.push({
        device,
        sim,
      });
    }
  }

  if (!candidates.length) {
    throw new Error(
      `${network} SIM is not available on any gateway.`
    );
  }

  candidates.sort((a, b) => {

    const signalA = a.device.signal || 0;
    const signalB = b.device.signal || 0;

    const airtimeA =
      Number(a.sim.airtimeBalance || 0);

    const airtimeB =
      Number(b.sim.airtimeBalance || 0);

    if (airtimeB !== airtimeA) {
      return airtimeB - airtimeA;
    }

    return signalB - signalA;
  });

  return {
    device: candidates[0].device,
    sim: candidates[0].sim,
  };
};