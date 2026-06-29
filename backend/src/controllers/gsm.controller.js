const prisma = require("../config/prisma");
const { findBestSim, debitSimBalance } = require("../services/gsm.service");
const { emitEvent } = require("../config/socket");
exports.seedSims = async (req, res) => {
  try {
    const sims = [];

    for (let i = 1; i <= 32; i++) {
      sims.push({
        slot: i,
        number: `080000000${String(i).padStart(2, "0")}`,
        type: i <= 16 ? "DATA" : "VTU",
        network:
          i === 30 || i === 31
            ? "GLO"
            : i === 32
            ? "9mobile"
            : i % 2 === 0
            ? "MTN"
            : "Airtel",
        balance: i % 5 === 0 ? 250 : i % 3 === 0 ? 800 : 2500,
        status: "ACTIVE",
      });
    }

    for (const sim of sims) {
      await prisma.gsmSim.upsert({
        where: { slot: sim.slot },
        update: sim,
        create: sim,
      });
    }

    return res.json({
      success: true,
      message: "32 GSM SIMs seeded successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getSims = async (req, res) => {
  try {
    const sims = await prisma.gsmSim.findMany({
      orderBy: { slot: "asc" },
    });

    return res.json({
      success: true,
      sims,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.autoSelectSim = async (req, res) => {
  try {
    const { type, network, amount } = req.body;

    const sim = await findBestSim({
      type,
      network,
      minBalance: Number(amount || 100),
    });

    if (!sim) {
      return res.status(404).json({
        success: false,
        message: "No available SIM found",
      });
    }

    return res.json({
      success: true,
      sim,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.buyWithGatewaySim = async (req, res) => {
  try {
    const { type, network, amount } = req.body;

    const sim = await findBestSim({
      type,
      network,
      minBalance: Number(amount),
    });

    if (!sim) {
      return res.status(404).json({
        success: false,
        message: "No available SIM found",
      });
    }

    const updatedSim = await debitSimBalance(sim.id, Number(amount));

    return res.json({
      success: true,
      message: `Transaction processed using SIM ${sim.slot}`,
      sim: updatedSim,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};