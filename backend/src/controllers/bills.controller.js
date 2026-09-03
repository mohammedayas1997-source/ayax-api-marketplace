const billsService = require("../services/bills.service");
const prisma = require("../config/prisma");

/* ======================================================
   CABLE TV CONTROLLERS
====================================================== */

// 1. Jerin Fakitin Cable TV (DStv, GOtv, Startimes)
exports.getCablePackages = async (req, res) => {
  try {
    const { cableTv } = req.query;
    const packages = await billsService.getCablePlans(cableTv);

    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    console.error("Get cable packages error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch cable packages.",
      error: error.message,
    });
  }
};

// 2. Tabbatar da SmartCard / IUC Number
exports.verifyCable = async (req, res) => {
  try {
    const result = await billsService.validateCableIUC(req.body);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Verify cable error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to verify SmartCard number.",
    });
  }
};

// 3. Sayen / Sabunta Cable TV
exports.purchaseCable = async (req, res) => {
  try {
    const user = req.apiUser || req.user;
    const result = await billsService.purchaseCable({
      user,
      apiKey: req.apiKey,
      ...req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Cable TV subscription successful.",
      data: result,
    });
  } catch (error) {
    console.error("Purchase cable error:", error);
    const statusCode = Number(error.statusCode || error.status || 400);
    return res.status(statusCode).json({
      success: false,
      code: error.code || "CABLE_PURCHASE_FAILED",
      message: error.message || "Unable to complete cable subscription.",
    });
  }
};

/* ======================================================
   ELECTRICITY CONTROLLERS
====================================================== */

// 1. Jerin DISCOs na Wuta (All 12 Providers)
exports.getElectricityDiscos = async (req, res) => {
  try {
    const discos = await billsService.getElectricityDiscos();

    return res.status(200).json({
      success: true,
      count: discos.length,
      discos,
    });
  } catch (error) {
    console.error("Get electricity discos error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve electricity DISCOs.",
      error: error.message,
    });
  }
};

// 2. Tabbatar da Meter Number
exports.verifyMeter = async (req, res) => {
  try {
    const result = await billsService.validateMeterNumber(req.body);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Verify meter error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to verify meter number.",
    });
  }
};

// 3. Sayen Token / Biyan Kudin Wuta
exports.purchaseElectricity = async (req, res) => {
  try {
    const user = req.apiUser || req.user;
    const result = await billsService.purchaseElectricity({
      user,
      apiKey: req.apiKey,
      ...req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Electricity purchase successful.",
      data: result,
    });
  } catch (error) {
    console.error("Purchase electricity error:", error);
    const statusCode = Number(error.statusCode || error.status || 400);
    return res.status(statusCode).json({
      success: false,
      code: error.code || "ELECTRICITY_PURCHASE_FAILED",
      message: error.message || "Unable to complete electricity purchase.",
    });
  }
};