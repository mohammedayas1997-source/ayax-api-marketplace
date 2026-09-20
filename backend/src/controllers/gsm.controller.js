const prisma = require("../config/prisma");
const { findBestSim, debitSimBalance } = require("../services/gsm.service");
const { emitEvent } = require("../config/socket");

const NETWORK_MAP = {
  "1": "MTN",
  "2": "AIRTEL",
  "3": "9MOBILE",
  "4": "GLO",
};

const normalizeNetwork = (net = "") => {
  const clean = String(net).trim().toUpperCase();
  return NETWORK_MAP[clean] || clean;
};

/* ======================================================
   1. SEED INITIAL 32 GSM SIMS (ADMIN SETUP)
   POST /api/v1/gsm/seed
====================================================== */
exports.seedSims = async (req, res) => {
  try {
    const sims = [];

    for (let i = 1; i <= 32; i++) {
      let network = "MTN";
      if (i === 30 || i === 31) {
        network = "GLO";
      } else if (i === 32) {
        network = "9MOBILE";
      } else if (i % 2 === 0) {
        network = "MTN";
      } else {
        network = "AIRTEL";
      }

      sims.push({
        slot: i,
        slotIndex: i - 1,
        number: `080000000${String(i).padStart(2, "0")}`,
        type: i <= 16 ? "DATA" : "VTU",
        network,
        carrierName: network,
        displayName: `${network} Line ${i}`,
        balance: i % 5 === 0 ? 250 : i % 3 === 0 ? 800 : 2500,
        airtimeBalance: i % 5 === 0 ? 250 : i % 3 === 0 ? 800 : 2500,
        status: "ACTIVE",
      });
    }

    const operations = sims.map((sim) =>
      prisma.gsmSim.upsert({
        where: { slot: sim.slot },
        update: {
          number: sim.number,
          type: sim.type,
          network: sim.network,
          carrierName: sim.carrierName,
          displayName: sim.displayName,
          balance: sim.balance,
          airtimeBalance: sim.airtimeBalance,
          status: sim.status,
        },
        create: sim,
      })
    );

    await prisma.$transaction(operations);

    emitEvent("sims-seeded", {
      message: "32 GSM SIMs initialized successfully.",
      count: 32,
    });

    return res.status(200).json({
      success: true,
      status: "success",
      message: "32 GSM SIMs seeded successfully into the local gateway.",
      count: 32,
    });
  } catch (error) {
    console.error("Seed SIMs error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ======================================================
   2. GET ALL SIMS (GATEWAY MONITORING / ADMIN DASHBOARD)
   GET /api/v1/gsm/sims
====================================================== */
exports.getSims = async (req, res) => {
  try {
    const { network, type, status } = req.query;

    const where = {};
    if (network) where.network = normalizeNetwork(network);
    if (type) where.type = String(type).toUpperCase().trim();
    if (status) where.status = String(status).toUpperCase().trim();

    const sims = await prisma.gsmSim.findMany({
      where,
      orderBy: { slot: "asc" },
    });

    const totalBalance = sims.reduce(
      (sum, s) => sum + Number(s.balance || s.airtimeBalance || 0),
      0
    );

    return res.status(200).json({
      success: true,
      status: "success",
      count: sims.length,
      totalBalance,
      sims,
    });
  } catch (error) {
    console.error("Get SIMs error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ======================================================
   3. AUTO-SELECT OPTIMAL SIM FOR OPERATION
   POST /api/v1/gsm/auto-select
====================================================== */
exports.autoSelectSim = async (req, res) => {
  try {
    const { type, network, network_id, amount } = req.body;

    const resolvedNetwork = normalizeNetwork(network || network_id || "MTN");
    const requiredAmount = Number(amount || 50);

    let sim = null;

    if (typeof findBestSim === "function") {
      sim = await findBestSim({
        type: type ? String(type).toUpperCase().trim() : undefined,
        network: resolvedNetwork,
        minBalance: requiredAmount,
      });
    }

    if (!sim) {
      sim = await prisma.gsmSim.findFirst({
        where: {
          network: resolvedNetwork,
          status: "ACTIVE",
          OR: [
            { balance: { gte: requiredAmount } },
            { airtimeBalance: { gte: requiredAmount } },
          ],
        },
        orderBy: [
          { balance: "desc" },
          { slot: "asc" },
        ],
      });
    }

    if (!sim) {
      return res.status(404).json({
        success: false,
        status: "failed",
        code: "NO_ACTIVE_SIM",
        message: `No active SIM found for ${resolvedNetwork} with minimum balance of ₦${requiredAmount}.`,
      });
    }

    return res.status(200).json({
      success: true,
      status: "success",
      message: `SIM selected from slot ${sim.slot}.`,
      sim: {
        id: sim.id,
        slot: sim.slot,
        slotIndex: sim.slotIndex ?? (sim.slot - 1),
        network: sim.network,
        number: sim.number,
        type: sim.type,
        balance: Number(sim.balance || sim.airtimeBalance || 0),
        status: sim.status,
      },
    });
  } catch (error) {
    console.error("Auto select SIM error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ======================================================
   4. BUY VIA LOCAL GATEWAY SIM (DIRECT LOCAL USSD / SMS)
   POST /api/v1/gsm/buy
====================================================== */
exports.buyWithGatewaySim = async (req, res) => {
  try {
    const { type, network, network_id, amount, phone, planId } = req.body;

    const resolvedNetwork = normalizeNetwork(network || network_id || "MTN");
    const requiredAmount = Number(amount);

    if (isNaN(requiredAmount) || requiredAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive amount is required.",
      });
    }

    let sim = null;

    if (typeof findBestSim === "function") {
      sim = await findBestSim({
        type: type ? String(type).toUpperCase().trim() : undefined,
        network: resolvedNetwork,
        minBalance: requiredAmount,
      });
    }

    if (!sim) {
      sim = await prisma.gsmSim.findFirst({
        where: {
          network: resolvedNetwork,
          status: "ACTIVE",
          OR: [
            { balance: { gte: requiredAmount } },
            { airtimeBalance: { gte: requiredAmount } },
          ],
        },
        orderBy: { balance: "desc" },
      });
    }

    if (!sim) {
      return res.status(404).json({
        success: false,
        status: "failed",
        code: "INSUFFICIENT_SIM_BALANCE",
        message: `No available SIM for ${resolvedNetwork} with sufficient balance (Required: ₦${requiredAmount}).`,
      });
    }

    let updatedSim = null;

    if (typeof debitSimBalance === "function") {
      updatedSim = await debitSimBalance(sim.id, requiredAmount);
    } else {
      updatedSim = await prisma.gsmSim.update({
        where: { id: sim.id },
        data: {
          balance: { decrement: requiredAmount },
          airtimeBalance: { decrement: requiredAmount },
        },
      });
    }

    emitEvent("sim-balance-updated", {
      simId: sim.id,
      slot: sim.slot,
      network: sim.network,
      newBalance: updatedSim.balance ?? updatedSim.airtimeBalance,
      deducted: requiredAmount,
    });

    return res.status(200).json({
      success: true,
      status: "success",
      message: `Transaction processed using SIM slot ${sim.slot}`,
      data: {
        slot: sim.slot,
        slotIndex: sim.slotIndex ?? (sim.slot - 1),
        network: sim.network,
        recipient: phone || null,
        planId: planId || null,
        amountDeducted: requiredAmount,
        remainingBalance: Number(updatedSim.balance || updatedSim.airtimeBalance || 0),
      },
      sim: updatedSim,
    });
  } catch (error) {
    console.error("Buy with Gateway SIM error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ======================================================
   5. UPDATE INDIVIDUAL SIM DETAILS (ADMIN CONTROL)
   PUT /api/v1/gsm/sims/:id
====================================================== */
exports.updateSim = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, network, type, balance, airtimeBalance, status } = req.body;

    const existingSim = await prisma.gsmSim.findUnique({
      where: { id },
    });

    if (!existingSim) {
      return res.status(404).json({
        success: false,
        message: "SIM record not found.",
      });
    }

    const updateData = {};
    if (number !== undefined) updateData.number = String(number).trim();
    if (network !== undefined) {
      const norm = normalizeNetwork(network);
      updateData.network = norm;
      updateData.carrierName = norm;
    }
    if (type !== undefined) updateData.type = String(type).toUpperCase().trim();
    if (status !== undefined) updateData.status = String(status).toUpperCase().trim();

    if (balance !== undefined || airtimeBalance !== undefined) {
      const parsedBal = Number(balance ?? airtimeBalance);
      if (!isNaN(parsedBal) && parsedBal >= 0) {
        updateData.balance = parsedBal;
        updateData.airtimeBalance = parsedBal;
      }
    }

    const updated = await prisma.gsmSim.update({
      where: { id },
      data: updateData,
    });

    emitEvent("sim-updated", {
      simId: updated.id,
      slot: updated.slot,
      sim: updated,
    });

    return res.status(200).json({
      success: true,
      status: "success",
      message: `SIM in slot ${updated.slot} updated successfully.`,
      sim: updated,
    });
  } catch (error) {
    console.error("Update SIM error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};