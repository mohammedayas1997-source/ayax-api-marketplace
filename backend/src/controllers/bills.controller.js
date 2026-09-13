const billsService = require("../services/bills.service");
const prisma = require("../config/prisma");

// Nemi Al-Ihsan service idan yana nan a folder
let alIhsanService = null;
try {
  alIhsanService = require("../services/alIhsanService");
} catch (_) {
  try {
    alIhsanService = require("./alIhsanService");
  } catch (e) {
    alIhsanService = null;
  }
}

/* ======================================================
   CABLE TV CONTROLLERS
====================================================== */

// 1. Jerin Fakitin Cable TV (DStv, GOtv, Startimes)
exports.getCablePackages = async (req, res) => {
  try {
    const { cableTv, provider } = req.query;
    const targetCable = String(cableTv || provider || "").toLowerCase();

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

    let result = null;

    // A. Gwada billsService da farko
    if (typeof billsService.validateCableIUC === "function") {
      try {
        result = await billsService.validateCableIUC({
          cableTv: normalizedProvider,
          smartCardNo: normalizedCardNo,
        });
      } catch (err) {
        console.warn("billsService validateCableIUC failed, trying Al-Ihsan:", err.message);
      }
    }

    // B. Gwada Al-Ihsan Service idan na farko bai yi ba
    if (!result && alIhsanService && typeof alIhsanService.validateCableIUC === "function") {
      const alIhsanRes = await alIhsanService.validateCableIUC({
        cableCompany: normalizedProvider.toUpperCase(),
        iucNumber: normalizedCardNo,
      });

      if (alIhsanRes.success) {
        result = alIhsanRes.data;
      }
    }

    if (!result) {
      throw new Error("Unable to verify SmartCard with available gateways.");
    }

    const customerName =
      result.customerName ||
      result.Customer_Name ||
      result.customer_name ||
      result.name ||
      result.raw?.customer_name ||
      "Verified Customer";

    return res.status(200).json({
      success: true,
      customerName,
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

    // Idempotency
    const txRef = reference ? String(reference).trim() : `AYAX_CABLE_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const existingTx = await prisma.transaction.findUnique({
      where: { reference: txRef },
    });
    if (existingTx) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_REFERENCE",
        message: "A transaction with this reference has already been processed.",
        transaction: existingTx,
      });
    }

    let result = null;

    // A. Gwada billsService
    if (typeof billsService.purchaseCable === "function") {
      try {
        result = await billsService.purchaseCable({
          user,
          apiKey: req.apiKey,
          cableTv: normalizedProvider,
          packageCode: normalizedPackage,
          smartCardNo: normalizedCardNo,
          phone: String(phone || phoneNumber || user.phone || ""),
          amount: finalAmount,
          reference: txRef,
        });
      } catch (err) {
        console.warn("billsService purchaseCable failed, falling back to Al-Ihsan:", err.message);
      }
    }

    // B. Fallback zuwa Al-Ihsan kai-tsaye idan na farko bai yi ba
    if (!result && alIhsanService && typeof alIhsanService.purchaseCableSubscription === "function") {
      const alIhsanRes = await alIhsanService.purchaseCableSubscription({
        cableCompany: normalizedProvider.toUpperCase(),
        cablePlan: normalizedPackage,
        iucNumber: normalizedCardNo,
      });

      if (alIhsanRes.success) {
        result = {
          provider: "ALIHSAN",
          raw: alIhsanRes.data,
          status: "SUCCESSFUL",
        };

        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: "DEBIT",
            service: `${normalizedProvider.toUpperCase()} CABLE`,
            amount: finalAmount,
            status: "SUCCESSFUL",
            reference: txRef,
            description: `Cable subscription to ${normalizedCardNo} via ALIHSAN`,
          },
        });
      } else {
        throw new Error(alIhsanRes.message || "Al-Ihsan cable subscription failed.");
      }
    }

    if (!result) {
      throw new Error("Cable TV purchase failed across available gateways.");
    }

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

    let result = null;

    // A. Gwada billsService
    if (typeof billsService.validateMeterNumber === "function") {
      try {
        result = await billsService.validateMeterNumber({
          disco: normalizedDisco,
          meterNo: normalizedMeterNo,
          meterType: normalizedMeterType,
        });
      } catch (err) {
        console.warn("billsService validateMeterNumber failed, trying Al-Ihsan:", err.message);
      }
    }

    // B. Gwada Al-Ihsan
    if (!result && alIhsanService && typeof alIhsanService.validateElectricityMeter === "function") {
      const alIhsanRes = await alIhsanService.validateElectricityMeter({
        discoName: normalizedDisco.toUpperCase(),
        meterNumber: normalizedMeterNo,
        meterType: normalizedMeterType.toUpperCase(),
      });

      if (alIhsanRes.success) {
        result = alIhsanRes.data;
      }
    }

    if (!result) {
      throw new Error("Unable to verify meter number with available gateways.");
    }

    const customerName =
      result.customerName ||
      result.Customer_Name ||
      result.customer_name ||
      result.name ||
      result.raw?.customer_name ||
      "Verified Meter Customer";

    return res.status(200).json({
      success: true,
      customerName,
      address: result.address || result.Customer_Address || "",
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

    // Idempotency
    const txRef = reference ? String(reference).trim() : `AYAX_ELEC_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const existingTx = await prisma.transaction.findUnique({
      where: { reference: txRef },
    });
    if (existingTx) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_REFERENCE",
        message: "A transaction with this reference has already been processed.",
        transaction: existingTx,
      });
    }

    let result = null;

    // A. Gwada billsService da farko
    if (typeof billsService.purchaseElectricity === "function") {
      try {
        result = await billsService.purchaseElectricity({
          user,
          apiKey: req.apiKey,
          disco: normalizedDisco,
          meterNo: normalizedMeterNo,
          meterType: normalizedMeterType,
          amount: finalAmount,
          phone: String(phone || phoneNumber || user.phone || ""),
          reference: txRef,
        });
      } catch (err) {
        console.warn("billsService purchaseElectricity failed, falling back to Al-Ihsan:", err.message);
      }
    }

    // B. Fallback zuwa Al-Ihsan kai-tsaye
    if (!result && alIhsanService && typeof alIhsanService.payElectricityBill === "function") {
      const alIhsanRes = await alIhsanService.payElectricityBill({
        discoName: normalizedDisco.toUpperCase(),
        meterNumber: normalizedMeterNo,
        amount: finalAmount,
        customerPhone: String(phone || phoneNumber || user.phone || "08011111111"),
        meterType: normalizedMeterType.toUpperCase(),
      });

      if (alIhsanRes.success) {
        const raw = alIhsanRes.data;
        result = {
          provider: "ALIHSAN",
          token: raw?.token || raw?.meter_token || raw?.purchased_code || null,
          units: raw?.units || null,
          raw,
        };

        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: "DEBIT",
            service: `${normalizedDisco.toUpperCase()} ELECTRICITY`,
            amount: finalAmount,
            status: "SUCCESSFUL",
            reference: txRef,
            description: `Electricity purchase for meter ${normalizedMeterNo} via ALIHSAN`,
          },
        });
      } else {
        throw new Error(alIhsanRes.message || "Al-Ihsan power payment failed.");
      }
    }

    if (!result) {
      throw new Error("Electricity purchase failed across available gateways.");
    }

    return res.status(200).json({
      success: true,
      message: "Electricity purchase successful.",
      token: result.token || result.purchased_code || null,
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