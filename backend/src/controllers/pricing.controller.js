const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

const ALLOWED_TIERS = [
  "REGULAR",
  "STANDARD",
  "PREMIUM",
  "AGENT",
  "DEVELOPER",
];

const NETWORK_MAP = {
  "1": "MTN",
  "2": "AIRTEL",
  "3": "9MOBILE",
  "4": "GLO",
};

const normalizeText = (value = "") => String(value || "").trim();

const normalizeCode = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeTier = (value = "") => String(value || "").trim().toUpperCase();

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

const serializePricing = (item) => {
  const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const networkId = String(metadata.networkId || "").trim();
  const network = String(metadata.network || NETWORK_MAP[networkId] || "").toUpperCase();

  return {
    id: item.id,
    serviceCode: item.serviceCode,
    serviceName: item.serviceName,
    category: item.category,
    tier: item.tier,
    costPrice: Number(item.costPrice || 0),
    sellingPrice: Number(item.sellingPrice || 0),
    apiPrice: Number(item.sellingPrice || 0),
    currency: item.currency,
    enabled: item.enabled,
    features: item.features,
    metadata: item.metadata,
    networkId: networkId || null,
    network: network || null,
    planId: metadata.planId || item.serviceCode,
    dataType: metadata.dataType || null,
    dataSize: metadata.dataSize || metadata.volume || null,
    validity: metadata.validity || "30 Days",
    ussdCode: metadata.ussdCode || null,
    gatewayPlanId: metadata.gatewayPlanId || metadata.planId || item.serviceCode,
    createdBy: item.createdBy,
    updatedBy: item.updatedBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

/* ======================================================
   PUBLIC PRICING (LANDING PAGE & VTU APP LOOKUP)
   GET /api/v1/pricing/public
====================================================== */
exports.getPublicPricing = async (req, res) => {
  try {
    const { category, tier = "REGULAR", network, networkId } = req.query;

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
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ category: "asc" }, { sellingPrice: "asc" }],
    });

    let serializedList = pricing.map(serializePricing);

    const cleanNetworkId = normalizeText(networkId);
    const cleanNetwork = normalizeText(network).toUpperCase();

    if (cleanNetworkId) {
      serializedList = serializedList.filter(
        (p) => String(p.networkId) === cleanNetworkId
      );
    }

    if (cleanNetwork) {
      serializedList = serializedList.filter(
        (p) =>
          String(p.network).toUpperCase() === cleanNetwork ||
          String(p.serviceName).toUpperCase().includes(cleanNetwork) ||
          String(p.serviceCode).toUpperCase().includes(cleanNetwork)
      );
    }

    return res.status(200).json({
      success: true,
      count: serializedList.length,
      pricing: serializedList,
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
    const userId = req.user?.id || req.user?._id;

    // 1. Dauko standard plans
    let plans = await prisma.servicePricing.findMany({
      where: { enabled: true, tier: "REGULAR" },
      orderBy: { sellingPrice: "asc" },
    });

    let isVip = false;

    // 2. Duba ko Admin ya riga ya saka API Key din wannan customer din a PrivateTierWhitelist
    if (userId && prisma.privateTierWhitelist) {
      const vipRecord = await prisma.privateTierWhitelist.findFirst({
        where: {
          userId: userId,
          isActive: true,
          status: "APPROVED",
        },
      });

      if (vipRecord) {
        isVip = true;
        // Sauya farashin kowane plan ya zama na VIP
        plans = plans.map((plan) => {
          let customPrice = plan.sellingPrice;
          
          if (vipRecord.customMtnPrice && plan.serviceCode.includes("MTN")) {
            customPrice = vipRecord.customMtnPrice;
          } else if (vipRecord.discountPerGb) {
            customPrice = Math.max(plan.sellingPrice - vipRecord.discountPerGb, 0);
          }

          return {
            ...plan,
            sellingPrice: customPrice,
            isCustomRate: true,
          };
        });
      }
    }

    const serializedPlans = plans.map(serializePricing);

    return res.status(200).json({
      success: true,
      isVipMember: isVip,
      data: serializedPlans,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
      pricing: serializePricing(pricing),
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
      pricing: pricing.map(serializePricing),
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
      networkId,
      network,
      planId,
      dataType,
      dataSize,
      volume,
      validity,
      ussdCode,
      gatewayPlanId,
    } = req.body;

    const normalizedServiceCode = normalizeCode(planId || serviceCode);
    const normalizedServiceName = normalizeText(serviceName);
    const normalizedCategory = normalizeCode(category || "DATA");
    const normalizedTier = normalizeTier(tier || "REGULAR");

    if (
      !normalizedServiceCode ||
      !normalizedServiceName ||
      !normalizedCategory ||
      !normalizedTier
    ) {
      return res.status(400).json({
        success: false,
        message: "serviceCode/planId, serviceName, category and tier are required.",
      });
    }

    if (!ALLOWED_TIERS.includes(normalizedTier)) {
      return res.status(400).json({
        success: false,
        message: `Tier must be one of: ${ALLOWED_TIERS.join(", ")}.`,
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

    const cleanNetworkId = normalizeText(networkId || (metadata && metadata.networkId));
    const cleanNetwork = normalizeText(
      network || (metadata && metadata.network) || NETWORK_MAP[cleanNetworkId] || ""
    ).toUpperCase();

    const finalMetadata = {
      ...(typeof metadata === "object" && metadata !== null ? metadata : {}),
      networkId: cleanNetworkId || null,
      network: cleanNetwork || null,
      planId: normalizedServiceCode,
      dataType: dataType ? normalizeText(dataType).toUpperCase() : "SME",
      dataSize: dataSize || volume ? normalizeText(dataSize || volume) : null,
      volume: volume || dataSize ? normalizeText(volume || dataSize) : null,
      validity: validity ? normalizeText(validity) : "30 Days",
      ussdCode: ussdCode ? normalizeText(ussdCode) : null,
      gatewayPlanId: gatewayPlanId ? normalizeText(gatewayPlanId) : normalizedServiceCode,
    };

    const userId = getAuthenticatedUserId(req);

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
        metadata: finalMetadata,
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
        metadata: finalMetadata,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    emitEvent("pricing-created", {
      message: "Service pricing created/updated.",
      pricing: serializePricing(pricing),
    });

    return res.status(201).json({
      success: true,
      message: "Service pricing saved successfully.",
      pricing: serializePricing(pricing),
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
      const normalizedServiceCode = normalizeCode(item.planId || item.serviceCode);
      const normalizedServiceName = normalizeText(item.serviceName);
      const normalizedCategory = normalizeCode(item.category || "DATA");
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

      const cleanNetworkId = normalizeText(item.networkId || (item.metadata && item.metadata.networkId));
      const cleanNetwork = normalizeText(
        item.network || (item.metadata && item.metadata.network) || NETWORK_MAP[cleanNetworkId] || ""
      ).toUpperCase();

      const finalMetadata = {
        ...(typeof item.metadata === "object" && item.metadata !== null ? item.metadata : {}),
        networkId: cleanNetworkId || null,
        network: cleanNetwork || null,
        planId: normalizedServiceCode,
        dataType: item.dataType ? normalizeText(item.dataType).toUpperCase() : "SME",
        dataSize: item.dataSize || item.volume ? normalizeText(item.dataSize || item.volume) : null,
        volume: item.volume || item.dataSize ? normalizeText(item.volume || item.dataSize) : null,
        validity: item.validity ? normalizeText(item.validity) : "30 Days",
        ussdCode: item.ussdCode ? normalizeText(item.ussdCode) : null,
        gatewayPlanId: item.gatewayPlanId ? normalizeText(item.gatewayPlanId) : normalizedServiceCode,
      };

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
          metadata: finalMetadata,
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
          metadata: finalMetadata,
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
      pricing: results.map(serializePricing),
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

    if (req.body.serviceCode !== undefined || req.body.planId !== undefined) {
      const serviceCode = normalizeCode(req.body.planId || req.body.serviceCode);
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
          message: `Tier must be one of: ${ALLOWED_TIERS.join(", ")}.`,
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

    const updatedMetadata = {
      ...(existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
      ...(req.body.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {}),
    };

    if (req.body.networkId !== undefined) {
      updatedMetadata.networkId = normalizeText(req.body.networkId);
      if (!req.body.network && NETWORK_MAP[updatedMetadata.networkId]) {
        updatedMetadata.network = NETWORK_MAP[updatedMetadata.networkId];
      }
    }

    if (req.body.network !== undefined) {
      updatedMetadata.network = normalizeText(req.body.network).toUpperCase();
    }

    if (req.body.planId !== undefined || req.body.serviceCode !== undefined) {
      updatedMetadata.planId = normalizeCode(req.body.planId || req.body.serviceCode);
    }

    if (req.body.dataType !== undefined) {
      updatedMetadata.dataType = normalizeText(req.body.dataType).toUpperCase();
    }

    if (req.body.dataSize !== undefined || req.body.volume !== undefined) {
      const vol = normalizeText(req.body.volume || req.body.dataSize);
      updatedMetadata.dataSize = vol;
      updatedMetadata.volume = vol;
    }

    if (req.body.validity !== undefined) {
      updatedMetadata.validity = normalizeText(req.body.validity);
    }

    if (req.body.ussdCode !== undefined) {
      updatedMetadata.ussdCode = normalizeText(req.body.ussdCode);
    }

    if (req.body.gatewayPlanId !== undefined) {
      updatedMetadata.gatewayPlanId = normalizeText(req.body.gatewayPlanId);
    }

    data.metadata = Object.keys(updatedMetadata).length > 0 ? updatedMetadata : null;
    data.updatedBy = getAuthenticatedUserId(req);

    const pricing = await prisma.servicePricing.update({
      where: {
        id: req.params.id,
      },
      data,
    });

    emitEvent("pricing-updated", {
      message: "Service pricing updated.",
      pricing: serializePricing(pricing),
    });

    return res.status(200).json({
      success: true,
      message: "Service pricing updated successfully.",
      pricing: serializePricing(pricing),
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
      pricing: serializePricing(pricing),
    });

    return res.status(200).json({
      success: true,
      message: nextEnabled
        ? "Pricing enabled successfully."
        : "Pricing disabled successfully.",
      pricing: serializePricing(pricing),
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

/* ======================================================
   GET USER PRICING LIST (VIP & PRIVATE TIER SUPPORT)
   GET /api/v1/pricing/user-list
====================================================== */
exports.getUserPricingList = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    // 1. Dauko ainihin farashin kowa da kowa daga ServicePricing
    let plans = await prisma.servicePricing.findMany({
      where: { enabled: true },
      orderBy: { sellingPrice: "asc" },
    });

    // 2. Duba ko wannan mutumin yana da Activated Private Tier
    let privateProfile = null;
    if (userId && prisma.privateTierWhitelist) {
      privateProfile = await prisma.privateTierWhitelist.findFirst({
        where: {
          userId: userId,
          isActive: true,
          status: "APPROVED",
        },
      });
    }

    // 3. Idan yana da Private Tier, canza masa farashin a asirce
    const tailoredPlans = plans.map((plan) => {
      let finalPrice = plan.sellingPrice;
      let isCustomRate = false;

      if (privateProfile) {
        if (plan.category?.toLowerCase() === "data" || plan.serviceCode?.includes("DATA")) {
          if (privateProfile.customMtnPrice && plan.serviceCode?.includes("MTN")) {
            finalPrice = privateProfile.customMtnPrice;
            isCustomRate = true;
          } else if (privateProfile.discountPerGb) {
            finalPrice = Math.max(plan.sellingPrice - privateProfile.discountPerGb, 0);
            isCustomRate = true;
          }
        }
      }

      const serialized = serializePricing(plan);

      return {
        ...serialized,
        sellingPrice: finalPrice,
        apiPrice: finalPrice,
        isCustomRate: isCustomRate,
      };
    });

    return res.status(200).json({
      success: true,
      isVipMember: Boolean(privateProfile),
      data: tailoredPlans,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};