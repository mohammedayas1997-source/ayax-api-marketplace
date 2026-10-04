/**
 * Plan SIM Pool Controller
 * Path: src/controllers/planPool.controller.js
 */
const planSimPoolService = require("../services/planSimPool.service");
const mongoose = require("mongoose");

// 1. Zabar SIMs ko kara SIMs a karkashin Plan ID
exports.assignSimsToPlan = async (req, res) => {
  try {
    const { planId, simPhones, action } = req.body;
    const developerId = req.user?.id || req.user?._id || req.body.developerId || "default_dev";

    if (!planId || !Array.isArray(simPhones)) {
      return res.status(400).json({
        success: false,
        message: "planId and an array of simPhones are required.",
      });
    }

    const result = await planSimPoolService.assignSimsToPlan({
      developerId,
      planId,
      simPhones,
      action: action || "ADD",
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Nuna jerin Katinan SIM tare da Balance da bayanin ko yana Available ko a wani Plan yake
exports.getSimAvailabilityMatrix = async (req, res) => {
  try {
    const { planId } = req.query;
    const developerId = req.user?.id || req.user?._id || req.query.developerId || "default_dev";

    const matrix = await planSimPoolService.getSimAvailabilityMatrix(developerId, planId);

    return res.status(200).json({
      success: true,
      count: matrix.length,
      sims: matrix,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Duba dukkan Pools da developer ya tsara
exports.getDeveloperPlanPools = async (req, res) => {
  try {
    const developerId = req.user?.id || req.user?._id || req.query.developerId || "default_dev";
    const db = mongoose.connection?.db;

    if (!db) {
      return res.status(500).json({ success: false, message: "Database offline" });
    }

    const pools = await db
      .collection("plan_sim_pools")
      .find({ developerId: String(developerId) })
      .toArray();

    return res.status(200).json({
      success: true,
      count: pools.length,
      pools,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Cire wani SIM daga karkashin Plan
exports.removeSimFromPlan = async (req, res) => {
  try {
    const { planId, phone } = req.body;
    const developerId = req.user?.id || req.user?._id || req.body.developerId || "default_dev";

    if (!planId || !phone) {
      return res.status(400).json({ success: false, message: "planId and phone are required." });
    }

    const result = await planSimPoolService.assignSimsToPlan({
      developerId,
      planId,
      simPhones: [phone],
      action: "REMOVE",
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};