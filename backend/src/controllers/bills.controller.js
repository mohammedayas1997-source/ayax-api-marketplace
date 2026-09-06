const billsService = require("../services/bills.service");
const prisma = require("../config/prisma");

/* ======================================================
   CABLE TV CONTROLLERS
====================================================== */

// 1. Jerin Fakitin Cable TV (DStv, GOtv, Startimes)
exports.getCablePackages = async (req, res) => {
  try {
    const { cableTv, provider } = req.query;
    const targetCable = String(cableTv || provider || "").toLowerCase();

    // Idan akwai getCablePlans a billsService, yi amfani da shi; ko kuma duba ServicePlan kai tsaye
    let packages = [];
    if (typeof billsService.getCablePlans === "function") {
      packages = await billsService.getCablePlans(targetCable);
    } else {
      packages = await prisma.servicePlan.findMany({
        where: {
          type: "CABLE",
          isActive: true,
          ...(targetCable ? { network: targetCable.toUpperCase() } : {}),
        },
        orderBy: { apiPrice: "asc" },
      });
    }

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
    const { cableTv, provider, smartCardNo, smartcardNumber, iucNumber, iuc } = req.body;
    const normalizedCardNo = String(smartCardNo || smartcardNumber || iucNumber || iuc || "").trim();
    const normalizedProvider = String(cableTv || provider || "").trim();

    if (!normalizedCardNo || !normalizedProvider) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Cable provider (cableTv) and SmartCard/IUC number are required.",
      });
    }

    const result = await billsService.validateCableIUC({
      cableTv: normalizedProvider,
      smartCardNo: normalizedCardNo,
    });

    return res.status(200).json({
      success: true,
      customerName: result.customerName || result.name || "Verified Customer",
      data: result,
    });
  } catch (error) {
    console.error("Verify cable error:", error);
    return res.status(400).json({
      success: false,
      code: "CABLE_VERIFICATION_FAILED",
      message: error.message || "Failed to verify SmartCard number.",
    });
  }
};

// 3. Sayen / Sabunta Cable TV
exports.purchaseCable = async (req, res) => {
  try {
    const user = req.apiUser || req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const {
      cableTv,
      provider,
      packageCode,
      planId,
      smartCardNo,
      smartcardNumber,
      iucNumber,
      amount,
      phone,
      phoneNumber,
      reference,
    } = req.body;

    const normalizedProvider = String(cableTv || provider || "").trim();
    const normalizedCardNo = String(smartCardNo || smartcardNumber || iucNumber || "").trim();
    const normalizedPackage = String(packageCode || planId || "").trim();
    const finalAmount = Number(amount);

    if (!normalizedProvider || !normalizedCardNo || !normalizedPackage || !finalAmount || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Valid cable provider, smartcard number, package code, and amount are required.",
      });
    }

    const result = await billsService.purchaseCable({
      user,
      apiKey: req.apiKey,
      cableTv: normalizedProvider,
      packageCode: normalizedPackage,
      smartCardNo: normalizedCardNo,
      phone: String(phone || phoneNumber || user.phone || ""),
      amount: finalAmount,
      reference,
    });

    return res.status(200).json({
      success: true,
      message: "Cable TV subscription successful.",
      data: result,
    });
  } catch (error) {
    console.error("Purchase cable error:", error);
    const statusCode = Number(error.statusCode || error.status || 502);
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

// 1. Jerin DISCOs na Wuta
exports.getElectricityDiscos = async (req, res) => {
  try {
    let discos = [];
    if (typeof billsService.getElectricityDiscos === "function") {
      discos = await billsService.getElectricityDiscos();
    } else {
      discos = [
        { id: "kedco", name: "Kano Electricity (KEDCO)", code: "kedco" },
        { id: "aedc", name: "Abuja Electricity (AEDC)", code: "aedc" },
        { id: "ikedc", name: "Ikeja Electric (IKEDC)", code: "ikedc" },
        { id: "ekedc", name: "Eko Electric (EKEDC)", code: "ekedc" },
        { id: "ibedc", name: "Ibadan Electricity (IBEDC)", code: "ibedc" },
        { id: "phed", name: "Port Harcourt Electric (PHED)", code: "phed" },
        { id: "eedc", name: "Enugu Electricity (EEDC)", code: "eedc" },
        { id: "yedc", name: "Yola Electricity (YEDC)", code: "yedc" },
        { id: "kaedco", name: "Kaduna Electric (KAEDCO)", code: "kaedco" },
        { id: "bedc", name: "Benin Electricity (BEDC)", code: "bedc" },
        { id: "jed", name: "Jos Electricity (JED)", code: "jed" },
        { id: "aba", name: "Aba Power (APLE)", code: "aba" },
      ];
    }

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
    const { disco, provider, meterNo, meterNumber, meterType } = req.body;
    const normalizedDisco = String(disco || provider || "").trim();
    const normalizedMeterNo = String(meterNo || meterNumber || "").trim();
    const normalizedMeterType = String(meterType || "prepaid").toLowerCase().trim();

    if (!normalizedDisco || !normalizedMeterNo) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Electricity disco and meter number are required.",
      });
    }

    const result = await billsService.validateMeterNumber({
      disco: normalizedDisco,
      meterNo: normalizedMeterNo,
      meterType: normalizedMeterType,
    });

    return res.status(200).json({
      success: true,
      customerName: result.customerName || result.name || "Verified Meter Customer",
      address: result.address || "",
      data: result,
    });
  } catch (error) {
    console.error("Verify meter error:", error);
    return res.status(400).json({
      success: false,
      code: "METER_VERIFICATION_FAILED",
      message: error.message || "Failed to verify meter number.",
    });
  }
};

// 3. Sayen Token / Biyan Kudin Wuta
exports.purchaseElectricity = async (req, res) => {
  try {
    const user = req.apiUser || req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const {
      disco,
      provider,
      meterNo,
      meterNumber,
      meterType,
      amount,
      phone,
      phoneNumber,
      reference,
    } = req.body;

    const normalizedDisco = String(disco || provider || "").trim();
    const normalizedMeterNo = String(meterNo || meterNumber || "").trim();
    const normalizedMeterType = String(meterType || "prepaid").toLowerCase().trim();
    const finalAmount = Number(amount);

    if (!normalizedDisco || !normalizedMeterNo || !finalAmount || finalAmount < 500) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Valid DISCO provider, meter number, and a minimum amount of ₦500 are required.",
      });
    }

    const result = await billsService.purchaseElectricity({
      user,
      apiKey: req.apiKey,
      disco: normalizedDisco,
      meterNo: normalizedMeterNo,
      meterType: normalizedMeterType,
      amount: finalAmount,
      phone: String(phone || phoneNumber || user.phone || ""),
      reference,
    });

    return res.status(200).json({
      success: true,
      message: "Electricity purchase successful.",
      token: result.token || null,
      units: result.units || null,
      data: result,
    });
  } catch (error) {
    console.error("Purchase electricity error:", error);
    const statusCode = Number(error.statusCode || error.status || 502);
    return res.status(statusCode).json({
      success: false,
      code: error.code || "ELECTRICITY_PURCHASE_FAILED",
      message: error.message || "Unable to complete electricity purchase.",
    });
  }
};