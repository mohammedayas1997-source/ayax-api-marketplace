const prisma = require("../config/prisma");

exports.findBestDevice = async () => {
  const device = await prisma.gsmDevice.findFirst({
    where: {
      status: "ONLINE",
    },
    orderBy: {
      lastSeen: "desc",
    },
  });

  if (!device) {
    throw new Error("No online GSM gateway device available");
  }

  return device;
};