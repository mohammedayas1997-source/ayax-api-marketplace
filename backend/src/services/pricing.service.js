const prisma = require("../config/prisma");

// Helper don raba adadin kwanaki a lambobi (e.g. "30 Days" -> 30)
const parseValidityDays = (validityStr) => {
  if (!validityStr) return null;
  const match = String(validityStr).match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

// Cikakken mai cire da adana Metadata na Data, NIMC (NIN), NIBSS (BVN), da sauransu
const extractMetadata = (data = {}) => {
  const meta =
    typeof data.metadata === "object" && data.metadata !== null
      ? { ...data.metadata }
      : {};

  // 1. Tsarin Data (Data Bundles)
  if (data.dataType) meta.dataType = data.dataType; // SME, GIFTING, CORPORATE
  if (data.dataSize) meta.dataSize = data.dataSize; // 1GB, 2GB, 50GB
  if (data.validity) meta.validity = data.validity; // 30 Days, 1 Day

  // 2. Tsarin NIMC & NIBSS Verification (Slip Printing)
  if (data.slipType) meta.slipType = data.slipType; // Standard Slip, Premium/Plastic PVC Look
  if (data.printFormat) meta.printFormat = data.printFormat; // PDF, Raw Image, JSON Slip
  if (data.hasBiometrics !== undefined) meta.hasBiometrics = Boolean(data.hasBiometrics);

  // 3. Tsarin NIMC NIN Validation (Matsalolin NIMC gaba daya)
  if (data.validationIssue) meta.validationIssue = data.validationIssue; // BANK_MISMATCH, IMMIGRATION_PASSPORT, NO_RECORD_FOUND, PHOTO_ERROR, etc.
  if (data.validationIssueLabel) meta.validationIssueLabel = data.validationIssueLabel;
  if (data.resolutionPortal) meta.resolutionPortal = data.resolutionPortal; // NIS, NIBSS, NIMC Central, Telco Portal

  // 4. Identity & Provider Metadata
  if (data.identityType) meta.identityType = data.identityType; // NIN ko BVN
  if (data.serviceType) meta.serviceType = data.serviceType; // VERIFICATION_PRINT ko VALIDATION_RESOLUTION
  if (data.providerAgency) meta.providerAgency = data.providerAgency; // NIMC, NIBSS, NIS, NCC

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
      dataType: true,
      dataSize: true,
      validity: true,
      validityDays: true,
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
  const validityDays =
    data.validityDays !== undefined
      ? data.validityDays
      : parseValidityDays(data.validity);

  return prisma.servicePricing.create({
    data: {
      serviceCode: data.serviceCode,
      serviceName: data.serviceName,
      category: data.category,
      tier: data.tier || "REGULAR",

      // Direct Columns
      dataType: data.dataType || metadata?.dataType || null,
      dataSize: data.dataSize || metadata?.dataSize || null,
      validity: data.validity || metadata?.validity || null,
      validityDays: validityDays || null,

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
  const validityDays =
    data.validityDays !== undefined
      ? data.validityDays
      : parseValidityDays(data.validity);

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

      // Direct Columns Update
      dataType: data.dataType !== undefined ? data.dataType : metadata?.dataType,
      dataSize: data.dataSize !== undefined ? data.dataSize : metadata?.dataSize,
      validity: data.validity !== undefined ? data.validity : metadata?.validity,
      validityDays: validityDays !== null ? validityDays : undefined,

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

      // Direct Columns Create
      dataType: data.dataType || metadata?.dataType || null,
      dataSize: data.dataSize || metadata?.dataSize || null,
      validity: data.validity || metadata?.validity || null,
      validityDays: validityDays || null,

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
  const validityDays =
    data.validityDays !== undefined
      ? data.validityDays
      : parseValidityDays(data.validity);

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

  if (data.dataType !== undefined) updateData.dataType = data.dataType;
  if (data.dataSize !== undefined) updateData.dataSize = data.dataSize;
  if (data.validity !== undefined) {
    updateData.validity = data.validity;
    updateData.validityDays = validityDays;
  }

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