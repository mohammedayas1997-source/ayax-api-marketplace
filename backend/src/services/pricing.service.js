const prisma = require("../config/prisma");

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
      metadata: data.metadata || null,

      createdBy: data.createdBy || null,
      updatedBy: data.createdBy || null,
    },
  });
};

exports.upsertPricing = async (data) => {
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
      costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
      sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : undefined,
      currency: data.currency,
      enabled: data.enabled !== undefined ? Boolean(data.enabled) : undefined,
      features: data.features,
      metadata: data.metadata,
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
      metadata: data.metadata || null,
      createdBy: data.createdBy || null,
      updatedBy: data.createdBy || null,
    },
  });
};

exports.updatePricing = async (id, data) => {
  return prisma.servicePricing.update({
    where: { id },
    data: {
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
      metadata: data.metadata,

      updatedBy: data.updatedBy || null,
    },
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