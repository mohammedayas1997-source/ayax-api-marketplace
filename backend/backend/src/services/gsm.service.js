const prisma = require("../config/prisma");

exports.findBestSim = async ({ type, network, minBalance = 100 }) => {
  const sim = await prisma.gsmSim.findFirst({
    where: {
      type,
      network,
      status: "ACTIVE",
      balance: {
        gte: minBalance,
      },
    },
    orderBy: {
      balance: "desc",
    },
  });

  return sim;
};

exports.debitSimBalance = async (simId, amount) => {
  return prisma.gsmSim.update({
    where: { id: simId },
    data: {
      balance: {
        decrement: Number(amount),
      },
    },
  });
};