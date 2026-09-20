const prisma = require("../config/prisma");

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

const normalizeText = (value) =>
  String(value || "").trim();

const normalizeUppercase = (value) =>
  normalizeText(value).toUpperCase();

const parseAmount = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Number(amount.toFixed(2));
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
    profit: Number(item.sellingPrice || 0) - Number(item.costPrice || 0),
    currency: item.currency,
    enabled: item.enabled,
    features: item.features,
    metadata: item.metadata,
    networkId: networkId || null,
    network: network || null,
    planId: metadata.planId || item.serviceCode,
    dataType: metadata.dataType || null,
    dataSize: metadata.dataSize || null,
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
   PUBLIC: GET ALL ENABLED PLANS (LANDING PAGE & VTU APP)

   GET /api/v1/service-pricing
====================================================== */

exports.getPublicPricing = async (req, res) => {
  try {
    const { category, tier, network, networkId } = req.query;

    const where = {
      enabled: true,
    };

    if (category) {
      where.category = normalizeUppercase(category);
    }

    if (tier) {
      const normalizedTier = normalizeUppercase(tier);
      if (ALLOWED_TIERS.includes(normalizedTier)) {
        where.tier = normalizedTier;
      }
    }

    const pricing = await prisma.servicePricing.findMany({
      where,
      orderBy: [
        { category: "asc" },
        { tier: "asc" },
        { sellingPrice: "asc" },
      ],
    });

    let serializedList = pricing.map(serializePricing);

    const cleanNetworkId = normalizeText(networkId);
    const cleanNetwork = normalizeUppercase(network);

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

    const groupedPricing = serializedList.reduce((groups, item) => {
      const cat = item.category.toUpperCase();
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
      return groups;
    }, {});

    const categories = Object.entries(groupedPricing).map(
      ([cat, plans]) => ({
        category: cat,
        title: cat.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        count: plans.length,
        plans,
      })
    );

    return res.status(200).json({
      success: true,
      message: "Service prices retrieved successfully.",
      pricing: serializedList,
      groupedPricing,
      categories,
    });
  } catch (error) {
    console.error("Get public pricing error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve service prices.",
    });
  }
};

/* ======================================================
   ADMIN: GET ALL PRICING

   GET /api/v1/admin/service-pricing
====================================================== */

exports.getAdminPricing = async (req, res) => {
  try {
    const { category, tier, enabled, search, network, networkId } = req.query;

    const where = {};

    if (category) {
      where.category = normalizeUppercase(category);
    }

    if (tier) {
      const normalizedTier = normalizeUppercase(tier);
      if (!ALLOWED_TIERS.includes(normalizedTier)) {
        return res.status(400).json({
          success: false,
          message: `Tier must be one of: ${ALLOWED_TIERS.join(", ")}.`,
        });
      }
      where.tier = normalizedTier;
    }

    if (enabled !== undefined) {
      where.enabled = String(enabled).toLowerCase() === "true";
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
        { tier: "asc" },
        { sellingPrice: "asc" },
      ],
    });

    let serialized = pricing.map(serializePricing);

    const cleanNetworkId = normalizeText(networkId);
    const cleanNetwork = normalizeUppercase(network);

    if (cleanNetworkId) {
      serialized = serialized.filter(
        (p) => String(p.networkId) === cleanNetworkId
      );
    }

    if (cleanNetwork) {
      serialized = serialized.filter(
        (p) =>
          String(p.network).toUpperCase() === cleanNetwork ||
          String(p.serviceName).toUpperCase().includes(cleanNetwork) ||
          String(p.serviceCode).toUpperCase().includes(cleanNetwork)
      );
    }

    return res.status(200).json({
      success: true,
      count: serialized.length,
      pricing: serialized,
    });
  } catch (error) {
    console.error("Get admin pricing error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve service pricing.",
    });
  }
};

/* ======================================================
   ADMIN: CREATE PLAN (WITH NETWORK ID, DATA TYPE & VALIDITY)

   POST /api/v1/admin/service-pricing
====================================================== */

exports.createPricing = async (req, res) => {
  try {
    const {
      serviceCode,
      serviceName,
      category,
      tier = "REGULAR",
      costPrice = 0,
      sellingPrice,
      apiPrice,
      currency = "NGN",
      enabled = true,
      features,
      metadata,
      networkId,
      network,
      planId,
      dataType,
      dataSize,
      validity,
      ussdCode,
      gatewayPlanId,
    } = req.body;

    const cleanCode = normalizeUppercase(planId || serviceCode);
    const cleanName = normalizeText(serviceName);
    const cleanCategory = normalizeUppercase(category || "DATA");
    const normalizedTier = normalizeUppercase(tier);
    const parsedCostPrice = parseAmount(costPrice);
    const parsedSellingPrice = parseAmount(sellingPrice ?? apiPrice);

    const cleanNetworkId = normalizeText(networkId || (metadata && metadata.networkId));
    const cleanNetwork = normalizeUppercase(
      network || (metadata && metadata.network) || NETWORK_MAP[cleanNetworkId] || ""
    );

    if (!cleanCode || !cleanName || !cleanCategory) {
      return res.status(400).json({
        success: false,
        message: "Service code/planId, name, and category are required.",
      });
    }

    if (!ALLOWED_TIERS.includes(normalizedTier)) {
      return res.status(400).json({
        success: false,
        message: `Tier must be one of: ${ALLOWED_TIERS.join(", ")}.`,
      });
    }

    if (parsedCostPrice === null || parsedSellingPrice === null) {
      return res.status(400).json({
        success: false,
        message: "Cost and selling prices must be valid numbers.",
      });
    }

    if (parsedSellingPrice < parsedCostPrice) {
      return res.status(400).json({
        success: false,
        message: "Selling price cannot be lower than cost price.",
      });
    }

    const finalMetadata = {
      ...(typeof metadata === "object" && metadata !== null ? metadata : {}),
      networkId: cleanNetworkId || null,
      network: cleanNetwork || null,
      planId: cleanCode,
      dataType: dataType ? normalizeUppercase(dataType) : "SME",
      dataSize: dataSize ? normalizeText(dataSize) : null,
      validity: validity ? normalizeText(validity) : "30 Days",
      ussdCode: ussdCode ? normalizeText(ussdCode) : null,
      gatewayPlanId: gatewayPlanId ? normalizeText(gatewayPlanId) : cleanCode,
    };

    const pricing = await prisma.servicePricing.create({
      data: {
        serviceCode: cleanCode,
        serviceName: cleanName,
        category: cleanCategory,
        tier: normalizedTier,
        costPrice: parsedCostPrice,
        sellingPrice: parsedSellingPrice,
        currency: normalizeUppercase(currency) || "NGN",
        enabled: Boolean(enabled),
        features: features ?? null,
        metadata: finalMetadata,
        createdBy: req.user?.id || null,
        updatedBy: req.user?.id || null,
      },
    });

    if (prisma.auditLog) {
      await prisma.auditLog
        .create({
          data: {
            userId: req.user?.id || null,
            userEmail: req.user?.email || null,
            action: "CREATE_SERVICE_PRICING",
            module: "SERVICE_PRICING",
            description: `Created ${cleanName} (${normalizedTier}) at ${parsedSellingPrice} NGN for Network ${cleanNetwork || cleanNetworkId}`,
            ipAddress: req.ip || null,
          },
        })
        .catch(console.error);
    }

    return res.status(201).json({
      success: true,
      message: "Service pricing created successfully.",
      pricing: serializePricing(pricing),
    });
  } catch (error) {
    console.error("Create pricing error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "This service code and tier already exist.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create service pricing: " + error.message,
    });
  }
};

/* ======================================================
   ADMIN: UPDATE PLAN

   PATCH /api/v1/admin/service-pricing/:id
====================================================== */

exports.updatePricing = async (req, res) => {
  try {
    const pricingId = String(req.params.id || "").trim();

    const existing = await prisma.servicePricing.findUnique({
      where: { id: pricingId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Service pricing not found.",
      });
    }

    const data = {};

    if (req.body.serviceCode !== undefined || req.body.planId !== undefined) {
      data.serviceCode = normalizeUppercase(req.body.planId || req.body.serviceCode);
    }

    if (req.body.serviceName !== undefined) {
      data.serviceName = normalizeText(req.body.serviceName);
    }

    if (req.body.category !== undefined) {
      data.category = normalizeUppercase(req.body.category);
    }

    if (req.body.tier !== undefined) {
      const tier = normalizeUppercase(req.body.tier);
      if (!ALLOWED_TIERS.includes(tier)) {
        return res.status(400).json({
          success: false,
          message: `Tier must be one of: ${ALLOWED_TIERS.join(", ")}.`,
        });
      }
      data.tier = tier;
    }

    if (req.body.costPrice !== undefined) {
      const costPrice = parseAmount(req.body.costPrice);
      if (costPrice === null) {
        return res.status(400).json({
          success: false,
          message: "Cost price must be valid.",
        });
      }
      data.costPrice = costPrice;
    }

    if (req.body.sellingPrice !== undefined || req.body.apiPrice !== undefined) {
      const sellingPrice = parseAmount(req.body.sellingPrice ?? req.body.apiPrice);
      if (sellingPrice === null) {
        return res.status(400).json({
          success: false,
          message: "Selling price must be valid.",
        });
      }
      data.sellingPrice = sellingPrice;
    }

    const finalCostPrice = data.costPrice ?? existing.costPrice;
    const finalSellingPrice = data.sellingPrice ?? existing.sellingPrice;

    if (finalSellingPrice < finalCostPrice) {
      return res.status(400).json({
        success: false,
        message: "Selling price cannot be lower than cost price.",
      });
    }

    if (req.body.currency !== undefined) {
      data.currency = normalizeUppercase(req.body.currency) || "NGN";
    }

    if (req.body.enabled !== undefined) {
      data.enabled = Boolean(req.body.enabled);
    }

    if (req.body.features !== undefined) {
      data.features = req.body.features;
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
      updatedMetadata.network = normalizeUppercase(req.body.network);
    }

    if (req.body.planId !== undefined || req.body.serviceCode !== undefined) {
      updatedMetadata.planId = normalizeUppercase(req.body.planId || req.body.serviceCode);
    }

    if (req.body.dataType !== undefined) {
      updatedMetadata.dataType = normalizeUppercase(req.body.dataType);
    }

    if (req.body.dataSize !== undefined) {
      updatedMetadata.dataSize = normalizeText(req.body.dataSize);
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
    data.updatedBy = req.user?.id || null;

    const pricing = await prisma.servicePricing.update({
      where: { id: existing.id },
      data,
    });

    if (prisma.auditLog) {
      await prisma.auditLog
        .create({
          data: {
            userId: req.user?.id || null,
            userEmail: req.user?.email || null,
            action: "UPDATE_SERVICE_PRICING",
            module: "SERVICE_PRICING",
            description: `Updated ${pricing.serviceName} (${pricing.tier})`,
            ipAddress: req.ip || null,
          },
        })
        .catch(console.error);
    }

    return res.status(200).json({
      success: true,
      message: "Service pricing updated successfully.",
      pricing: serializePricing(pricing),
    });
  } catch (error) {
    console.error("Update pricing error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Another pricing plan already uses this service code and tier.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update service pricing: " + error.message,
    });
  }
};

/* ======================================================
   ADMIN: ENABLE OR DISABLE PLAN

   PATCH /api/v1/admin/service-pricing/:id/status
====================================================== */

exports.changePricingStatus = async (req, res) => {
  try {
    const pricing = await prisma.servicePricing.findUnique({
      where: { id: req.params.id },
    });

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "Service pricing not found.",
      });
    }

    const enabled =
      typeof req.body.enabled === "boolean"
        ? req.body.enabled
        : !pricing.enabled;

    const updated = await prisma.servicePricing.update({
      where: { id: pricing.id },
      data: {
        enabled,
        updatedBy: req.user?.id || null,
      },
    });

    if (prisma.auditLog) {
      await prisma.auditLog
        .create({
          data: {
            userId: req.user?.id || null,
            userEmail: req.user?.email || null,
            action: "TOGGLE_SERVICE_PRICING_STATUS",
            module: "SERVICE_PRICING",
            description: `${enabled ? "Enabled" : "Disabled"} plan ${updated.serviceCode}`,
            ipAddress: req.ip || null,
          },
        })
        .catch(console.error);
    }

    return res.status(200).json({
      success: true,
      message: enabled
        ? "Pricing plan enabled successfully."
        : "Pricing plan disabled successfully.",
      pricing: serializePricing(updated),
    });
  } catch (error) {
    console.error("Change pricing status error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to change pricing status.",
    });
  }
};

/* ======================================================
   ADMIN: DELETE PLAN

   DELETE /api/v1/admin/service-pricing/:id
====================================================== */

exports.deletePricing = async (req, res) => {
  try {
    const pricing = await prisma.servicePricing.findUnique({
      where: { id: req.params.id },
    });

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "Service pricing not found.",
      });
    }

    await prisma.servicePricing.delete({
      where: { id: pricing.id },
    });

    if (prisma.auditLog) {
      await prisma.auditLog
        .create({
          data: {
            userId: req.user?.id || null,
            userEmail: req.user?.email || null,
            action: "DELETE_SERVICE_PRICING",
            module: "SERVICE_PRICING",
            description: `Deleted pricing ${pricing.serviceName} (${pricing.serviceCode})`,
            ipAddress: req.ip || null,
          },
        })
        .catch(console.error);
    }

    return res.status(200).json({
      success: true,
      message: "Service pricing deleted successfully.",
    });
  } catch (error) {
    console.error("Delete pricing error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete service pricing.",
    });
  }
};