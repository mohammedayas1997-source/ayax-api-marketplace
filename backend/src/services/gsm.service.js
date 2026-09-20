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
/**
 * Zaɓo SIM mai ɗauke da ainihin Plan ID da aka nema
 */
async function findStrictSimForPlan({ network, planId }) {
  const cleanPlanId = String(planId || "").trim();
  const cleanNetwork = String(network || "").toUpperCase().trim();

  // 1. Nemo na'urori masu aiki (ONLINE) cikin mintuna 3 da suka gabata
  const onlineDevices = await prisma.gsmDevice.findMany({
    where: {
      status: "ONLINE",
      lastSeen: { gte: new Date(Date.now() - 3 * 60 * 1000) },
    },
    include: {
      sims: {
        where: {
          status: "ACTIVE",
        },
      },
    },
    orderBy: { lastSeen: "desc" },
  });

  if (!onlineDevices || onlineDevices.length === 0) {
    return { sim: null, device: null, error: "NO_ONLINE_GATEWAY" };
  }

  // 2. Bincika SIM ɗin da yake da wannan ainihin Plan ID ɗin kuma ba 0 ba
  for (const device of onlineDevices) {
    for (const sim of device.sims) {
      const simNetwork = String(sim.carrierName || sim.displayName || "").toUpperCase();

      // Tabbatar cibiyar sadarwa ta yi daidai (MTN, AIRTEL, da sauransu)
      if (!simNetwork.includes(cleanNetwork)) continue;

      // Duba ko layin yana ɗauke da wannan Plan ID ɗin
      const hasPlan = Array.isArray(sim.supportedPlans) && sim.supportedPlans.includes(cleanPlanId);
      if (!hasPlan) continue;

      // Duba balance na wannan ainihin plan ɗin
      const balances = sim.planBalances && typeof sim.planBalances === "object" ? sim.planBalances : {};
      const stock = balances[cleanPlanId] !== undefined ? Number(balances[cleanPlanId]) : 1;

      // Idan akwai sauran balance, zaɓi wannan layin nan take
      if (stock > 0) {
        return { sim, device, remainingStock: stock, error: null };
      }
    }
  }

  // Idan an duba dukkan layukan ba a samu ba ko kuma adadin ya zama 0
  return { sim: null, device: null, error: "PLAN_EXHAUSTED" };
}

/**
 * Rage adadin wannan ainihin plan ɗin da 1 bayan an tura wa mai siye
 */
async function deductPlanStock(simId, planId) {
  try {
    const cleanPlanId = String(planId).trim();
    const sim = await prisma.gsmSim.findUnique({ where: { id: simId } });
    if (!sim) return;

    const balances = sim.planBalances && typeof sim.planBalances === "object" ? { ...sim.planBalances } : {};
    const currentStock = balances[cleanPlanId] !== undefined ? Number(balances[cleanPlanId]) : 1;

    const newStock = Math.max(0, currentStock - 1);
    balances[cleanPlanId] = newStock;

    await prisma.gsmSim.update({
      where: { id: simId },
      data: {
        planBalances: balances,
      },
    });

    console.log(`📉 [SIM STOCK UPDATED]: SIM Slot ${sim.slotIndex}, Plan ${cleanPlanId} ya rage: ${newStock}`);
  } catch (err) {
    console.error("Gagara rage stock na plan a SIM:", err.message);
  }
}

module.exports = {
  findStrictSimForPlan,
  deductPlanStock,
};