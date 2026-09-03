const prisma = require("../config/prisma");

const extractMetadata = (data = {}) => {
  const meta =
    typeof data.metadata === "object" && data.metadata !== null
      ? { ...data.metadata }
      : {};

  if (data.dataType) meta.dataType = data.dataType;
  if (data.dataSize) meta.dataSize = data.dataSize;
  if (data.validity) meta.validity = data.validity;

  return Object.keys(meta).length > 0 ? meta : null;
};

// ==========================================
// 1. PUBLIC PRICING (LANDING PAGE & VTU CLIENTS)
// ==========================================
exports.getPublicPricing = async ({ category, tier = "REGULAR" } = {}) => {
  const where = {
    enabled: true,
  };

  if (category && category !== "ALL") {
    where.category = String(category).trim().toUpperCase();
  }

  if (tier && tier !== "ALL") {
    where.tier = String(tier).trim().toUpperCase();
  }

  return prisma.servicePricing.findMany({
    where,
    select: {
      id: true,
      serviceCode: true,
      serviceName: true,
      category: true,
      tier: true,
      sellingPrice: true,
      currency: true,
      features: true,
      metadata: true,
      updatedAt: true,
    },
    orderBy: [
      { category: "asc" },
      { sellingPrice: "asc" },
    ],
  });
};

// ==========================================
// 2. ADMIN LOOKUPS & CRUD OPERATIONS
// ==========================================
exports.getAllPricing = async () => {
  return prisma.servicePricing.findMany({
    orderBy: [
      { category: "asc" },
      { serviceCode: "asc" },
      { tier: "asc" },
    ],
  });
};

exports.getPricingByService = async (serviceCode) => {
  return prisma.servicePricing.findMany({
    where: {
      serviceCode,
      enabled: true,
    },
    orderBy: {
      tier: "asc",
    },
  });
};

exports.getPricingById = async (id) => {
  return prisma.servicePricing.findUnique({
    where: { id },
  });
};

exports.createPricing = async (data) => {
  const metadata = extractMetadata(data);

  return prisma.servicePricing.create({
    data: {
      serviceCode: data.serviceCode,
      serviceName: data.serviceName,
      category: data.category,
      tier: data.tier || "REGULAR",

      costPrice: Number(data.costPrice || 0),
      sellingPrice: Number(data.sellingPrice || 0),

      currency: data.currency || "NGN",

      enabled:
        data.enabled === undefined
          ? true
          : Boolean(data.enabled),

      features: data.features || null,
      metadata,

      createdBy: data.createdBy || null,
      updatedBy: data.createdBy || null,
    },
  });
};

exports.upsertPricing = async (data) => {
  const metadata = extractMetadata(data);

  return prisma.servicePricing.upsert({
    where: {
      serviceCode_tier: {
        serviceCode: data.serviceCode,
        tier: data.tier || "REGULAR",
      },
    },
    update: {
      serviceName: data.serviceName,
      category: data.category,
      costPrice:
        data.costPrice !== undefined ? Number(data.costPrice) : undefined,
      sellingPrice:
        data.sellingPrice !== undefined ? Number(data.sellingPrice) : undefined,
      currency: data.currency,
      enabled:
        data.enabled !== undefined ? Boolean(data.enabled) : undefined,
      features: data.features,
      metadata,
      updatedBy: data.updatedBy || null,
    },
    create: {
      serviceCode: data.serviceCode,
      serviceName: data.serviceName,
      category: data.category,
      tier: data.tier || "REGULAR",
      costPrice: Number(data.costPrice || 0),
      sellingPrice: Number(data.sellingPrice || 0),
      currency: data.currency || "NGN",
      enabled: data.enabled === undefined ? true : Boolean(data.enabled),
      features: data.features || null,
      metadata,
      createdBy: data.createdBy || null,
      updatedBy: data.createdBy || null,
    },
  });
};

exports.updatePricing = async (id, data) => {
  const metadata = extractMetadata(data);

  const updateData = {
    serviceName: data.serviceName,
    category: data.category,
    tier: data.tier,

    costPrice:
      data.costPrice !== undefined
        ? Number(data.costPrice)
        : undefined,

    sellingPrice:
      data.sellingPrice !== undefined
        ? Number(data.sellingPrice)
        : undefined,

    currency: data.currency,

    enabled:
      data.enabled !== undefined
        ? Boolean(data.enabled)
        : undefined,

    features: data.features,
    updatedBy: data.updatedBy || null,
  };

  if (metadata) {
    updateData.metadata = metadata;
  }

  return prisma.servicePricing.update({
    where: { id },
    data: updateData,
  });
};

exports.deletePricing = async (id) => {
  return prisma.servicePricing.delete({
    where: { id },
  });
};

exports.enablePricing = async (id) => {
  return prisma.servicePricing.update({
    where: { id },
    data: {
      enabled: true,
    },
  });
};

exports.disablePricing = async (id) => {
  return prisma.servicePricing.update({
    where: { id },
    data: {
      enabled: false,
    },
  });
};