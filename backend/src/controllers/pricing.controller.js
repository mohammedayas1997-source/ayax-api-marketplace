const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

const ALLOWED_TIERS = ["REGULAR", "STANDARD", "PREMIUM"];

const normalizeText = (value = "") => String(value).trim();

const normalizeCode = (value = "") =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeTier = (value = "") => String(value).trim().toUpperCase();

const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(
    String(value).trim().toLowerCase()
  );
};

const parseJsonValue = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const getAuthenticatedUserId = (req) =>
  req.user?.id || req.user?.userId || req.auth?.userId || null;

const sendControllerError = (res, error, fallbackMessage) => {
  console.error("PRICING_CONTROLLER_ERROR:", error);

  if (error?.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "Pricing already exists for this service and tier.",
    });
  }

  if (error?.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Pricing record not found.",
    });
  }

  return res.status(500).json({
    success: false,
    message: error?.message || fallbackMessage || "Pricing operation failed.",
  });
};

/* ======================================================
   PUBLIC PRICING (LANDING PAGE & VTU APP LOOKUP)
   GET /api/v1/pricing/public
====================================================== */
exports.getPublicPricing = async (req, res) => {
  try {
    const { category, tier = "REGULAR" } = req.query;

    const where = {
      enabled: true,
    };

    if (category) {
      where.category = normalizeCode(category);
    }

    if (tier) {
      where.tier = normalizeTier(tier);
    }

    const pricing = await prisma.servicePricing.findMany({
      where,
      select: {
        id: true,
        serviceCode: true,
        serviceName: true,
        category: true,
        tier: true,
        costPrice: false,
        sellingPrice: true,
        currency: true,
        features: true,
        metadata: true,
      },
      orderBy: [{ category: "asc" }, { sellingPrice: "asc" }],
    });

    return res.status(200).json({
      success: true,
      count: pricing.length,
      pricing,
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to load public pricing.");
  }
};

/* ======================================================
   GET ALL PRICING (ADMIN / DASHBOARD)
   GET /api/v1/pricing
====================================================== */
exports.getPricing = async (req, res) => {
  try {
    const { serviceCode, category, tier, enabled, search } = req.query;

    const where = {};

    if (serviceCode) {
      where.serviceCode = normalizeCode(serviceCode);
    }

    if (category) {
      where.category = normalizeCode(category);
    }

    if (tier) {
      const normalizedTier = normalizeTier(tier);
      if (!ALLOWED_TIERS.includes(normalizedTier)) {
        return res.status(400).json({
          success: false,
          message: "Tier must be REGULAR, STANDARD or PREMIUM.",
        });
      }
      where.tier = normalizedTier;
    }

    if (enabled !== undefined) {
      where.enabled = parseBoolean(enabled);
    }

    if (search) {
      const searchValue = normalizeText(search);
      where.OR = [
        { serviceName: { contains: searchValue, mode: "insensitive" } },
        { serviceCode: { contains: searchValue, mode: "insensitive" } },
        { category: { contains: searchValue, mode: "insensitive" } },
      ];
    }

    const pricing = await prisma.servicePricing.findMany({
      where,
      orderBy: [
        { category: "asc" },
        { serviceCode: "asc" },
        { tier: "asc" },
      ],
    });

    return res.status(200).json({
      success: true,
      count: pricing.length,
      pricing,
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to load pricing.");
  }
};

/* ======================================================
   GET PRICING BY ID
   GET /api/v1/pricing/:id
====================================================== */
exports.getPricingById = async (req, res) => {
  try {
    const pricing = await prisma.servicePricing.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "Pricing record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      pricing,
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to load pricing.");
  }
};

/* ======================================================
   GET SERVICE PRICING
   GET /api/v1/pricing/service/:serviceCode
====================================================== */
exports.getServicePricing = async (req, res) => {
  try {
    const serviceCode = normalizeCode(req.params.serviceCode);

    if (!serviceCode) {
      return res.status(400).json({
        success: false,
        message: "Service code is required.",
      });
    }

    const pricing = await prisma.servicePricing.findMany({
      where: {
        serviceCode,
        enabled: true,
      },
      orderBy: {
        tier: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      serviceCode,
      count: pricing.length,
      pricing,
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to load service pricing.");
  }
};

/* ======================================================
   CREATE OR UPSERT PRICING
   POST /api/v1/pricing
====================================================== */
exports.createPricing = async (req, res) => {
  try {
    const {
      serviceCode,
      serviceName,
      category,
      tier,
      costPrice,
      sellingPrice,
      currency,
      enabled,
      features,
      metadata,
    } = req.body;

    const normalizedServiceCode = normalizeCode(serviceCode);
    const normalizedServiceName = normalizeText(serviceName);
    const normalizedCategory = normalizeCode(category);
    const normalizedTier = normalizeTier(tier || "REGULAR");

    if (
      !normalizedServiceCode ||
      !normalizedServiceName ||
      !normalizedCategory ||
      !normalizedTier
    ) {
      return res.status(400).json({
        success: false,
        message: "serviceCode, serviceName, category and tier are required.",
      });
    }

    if (!ALLOWED_TIERS.includes(normalizedTier)) {
      return res.status(400).json({
        success: false,
        message: "Tier must be REGULAR, STANDARD or PREMIUM.",
      });
    }

    const numericCostPrice = Number(costPrice || 0);
    const numericSellingPrice = Number(sellingPrice);

    if (!Number.isFinite(numericCostPrice) || numericCostPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Cost price must be a valid amount.",
      });
    }

    if (!Number.isFinite(numericSellingPrice) || numericSellingPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Selling price must be a valid amount.",
      });
    }

    if (numericSellingPrice < numericCostPrice) {
      return res.status(400).json({
        success: false,
        message: "Selling price cannot be lower than cost price.",
      });
    }

    const userId = getAuthenticatedUserId(req);

    // Amfani da upsert maimakon create domin kaucewa matsalar Duplicate Error yayin tura dukkan tiers
    const pricing = await prisma.servicePricing.upsert({
      where: {
        serviceCode_tier: {
          serviceCode: normalizedServiceCode,
          tier: normalizedTier,
        },
      },
      update: {
        serviceName: normalizedServiceName,
        category: normalizedCategory,
        costPrice: numericCostPrice,
        sellingPrice: numericSellingPrice,
        currency: normalizeCode(currency || "NGN"),
        enabled: parseBoolean(enabled, true),
        features: parseJsonValue(features),
        metadata: parseJsonValue(metadata),
        updatedBy: userId,
      },
      create: {
        serviceCode: normalizedServiceCode,
        serviceName: normalizedServiceName,
        category: normalizedCategory,
        tier: normalizedTier,
        costPrice: numericCostPrice,
        sellingPrice: numericSellingPrice,
        currency: normalizeCode(currency || "NGN"),
        enabled: parseBoolean(enabled, true),
        features: parseJsonValue(features),
        metadata: parseJsonValue(metadata),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    emitEvent("pricing-created", {
      message: "Service pricing created/updated.",
      pricing,
    });

    return res.status(201).json({
      success: true,
      message: "Service pricing saved successfully.",
      pricing,
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to save pricing.");
  }
};

/* ======================================================
   CREATE BULK PRICING
   POST /api/v1/pricing/bulk
====================================================== */
exports.createBulkPricing = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A valid array of pricing items is required.",
      });
    }

    const userId = getAuthenticatedUserId(req);
    const operations = [];

    for (const item of items) {
      const normalizedServiceCode = normalizeCode(item.serviceCode);
      const normalizedServiceName = normalizeText(item.serviceName);
      const normalizedCategory = normalizeCode(item.category);
      const normalizedTier = normalizeTier(item.tier || "REGULAR");
      const numericCostPrice = Number(item.costPrice || 0);
      const numericSellingPrice = Number(item.sellingPrice || 0);

      if (
        !normalizedServiceCode ||
        !normalizedServiceName ||
        !normalizedCategory ||
        !ALLOWED_TIERS.includes(normalizedTier)
      ) {
        continue;
      }

      if (
        !Number.isFinite(numericCostPrice) ||
        !Number.isFinite(numericSellingPrice) ||
        numericSellingPrice < numericCostPrice
      ) {
        continue;
      }

      const operation = prisma.servicePricing.upsert({
        where: {
          serviceCode_tier: {
            serviceCode: normalizedServiceCode,
            tier: normalizedTier,
          },
        },
        update: {
          serviceName: normalizedServiceName,
          category: normalizedCategory,
          costPrice: numericCostPrice,
          sellingPrice: numericSellingPrice,
          currency: normalizeCode(item.currency || "NGN"),
          enabled: parseBoolean(item.enabled, true),
          features: parseJsonValue(item.features),
          metadata: parseJsonValue(item.metadata),
          updatedBy: userId,
        },
        create: {
          serviceCode: normalizedServiceCode,
          serviceName: normalizedServiceName,
          category: normalizedCategory,
          tier: normalizedTier,
          costPrice: numericCostPrice,
          sellingPrice: numericSellingPrice,
          currency: normalizeCode(item.currency || "NGN"),
          enabled: parseBoolean(item.enabled, true),
          features: parseJsonValue(item.features),
          metadata: parseJsonValue(item.metadata),
          createdBy: userId,
          updatedBy: userId,
        },
      });

      operations.push(operation);
    }

    if (operations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid pricing items were provided.",
      });
    }

    const results = await prisma.$transaction(operations);

    emitEvent("pricing-bulk-updated", {
      message: "Bulk service pricing updated.",
      count: results.length,
    });

    return res.status(200).json({
      success: true,
      message: `${results.length} pricing records processed successfully.`,
      count: results.length,
      pricing: results,
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to process bulk pricing.");
  }
};

/* ======================================================
   UPDATE PRICING
   PATCH /api/v1/pricing/:id
====================================================== */
exports.updatePricing = async (req, res) => {
  try {
    const existing = await prisma.servicePricing.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Pricing record not found.",
      });
    }

    const data = {};

    if (req.body.serviceCode !== undefined) {
      const serviceCode = normalizeCode(req.body.serviceCode);
      if (!serviceCode) {
        return res.status(400).json({
          success: false,
          message: "Service code cannot be empty.",
        });
      }
      data.serviceCode = serviceCode;
    }

    if (req.body.serviceName !== undefined) {
      const serviceName = normalizeText(req.body.serviceName);
      if (!serviceName) {
        return res.status(400).json({
          success: false,
          message: "Service name cannot be empty.",
        });
      }
      data.serviceName = serviceName;
    }

    if (req.body.category !== undefined) {
      const category = normalizeCode(req.body.category);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be empty.",
        });
      }
      data.category = category;
    }

    if (req.body.tier !== undefined) {
      const tier = normalizeTier(req.body.tier);
      if (!ALLOWED_TIERS.includes(tier)) {
        return res.status(400).json({
          success: false,
          message: "Tier must be REGULAR, STANDARD or PREMIUM.",
        });
      }
      data.tier = tier;
    }

    const nextCostPrice =
      req.body.costPrice !== undefined
        ? Number(req.body.costPrice)
        : Number(existing.costPrice);

    const nextSellingPrice =
      req.body.sellingPrice !== undefined
        ? Number(req.body.sellingPrice)
        : Number(existing.sellingPrice);

    if (!Number.isFinite(nextCostPrice) || nextCostPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Cost price must be a valid amount.",
      });
    }

    if (!Number.isFinite(nextSellingPrice) || nextSellingPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Selling price must be a valid amount.",
      });
    }

    if (nextSellingPrice < nextCostPrice) {
      return res.status(400).json({
        success: false,
        message: "Selling price cannot be lower than cost price.",
      });
    }

    if (req.body.costPrice !== undefined) data.costPrice = nextCostPrice;
    if (req.body.sellingPrice !== undefined) data.sellingPrice = nextSellingPrice;
    if (req.body.currency !== undefined) {
      data.currency = normalizeCode(req.body.currency || "NGN");
    }
    if (req.body.enabled !== undefined) {
      data.enabled = parseBoolean(req.body.enabled);
    }
    if (req.body.features !== undefined) {
      data.features = parseJsonValue(req.body.features);
    }
    if (req.body.metadata !== undefined) {
      data.metadata = parseJsonValue(req.body.metadata);
    }

    data.updatedBy = getAuthenticatedUserId(req);

    const pricing = await prisma.servicePricing.update({
      where: {
        id: req.params.id,
      },
      data,
    });

    emitEvent("pricing-updated", {
      message: "Service pricing updated.",
      pricing,
    });

    return res.status(200).json({
      success: true,
      message: "Service pricing updated successfully.",
      pricing,
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to update pricing.");
  }
};

/* ======================================================
   TOGGLE PRICING STATUS
   PATCH /api/v1/pricing/:id/status
====================================================== */
exports.togglePricingStatus = async (req, res) => {
  try {
    const existing = await prisma.servicePricing.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Pricing record not found.",
      });
    }

    const nextEnabled =
      req.body.enabled === undefined
        ? !existing.enabled
        : parseBoolean(req.body.enabled, existing.enabled);

    const pricing = await prisma.servicePricing.update({
      where: {
        id: req.params.id,
      },
      data: {
        enabled: nextEnabled,
        updatedBy: getAuthenticatedUserId(req),
      },
    });

    emitEvent("pricing-status-updated", {
      message: "Pricing status updated.",
      pricing,
    });

    return res.status(200).json({
      success: true,
      message: nextEnabled
        ? "Pricing enabled successfully."
        : "Pricing disabled successfully.",
      pricing,
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to update pricing status.");
  }
};

/* ======================================================
   DELETE PRICING
   DELETE /api/v1/pricing/:id
====================================================== */
exports.deletePricing = async (req, res) => {
  try {
    const existing = await prisma.servicePricing.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Pricing record not found.",
      });
    }

    await prisma.servicePricing.delete({
      where: {
        id: req.params.id,
      },
    });

    emitEvent("pricing-deleted", {
      message: "Service pricing deleted.",
      pricingId: req.params.id,
      serviceCode: existing.serviceCode,
      tier: existing.tier,
    });

    return res.status(200).json({
      success: true,
      message: "Service pricing deleted successfully.",
    });
  } catch (error) {
    return sendControllerError(res, error, "Unable to delete pricing.");
  }
};