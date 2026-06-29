const prisma = require("../config/prisma");

exports.getActivePlans = async () => {
  return prisma.apiPlan.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
};

exports.getPlanById = async (planId) => {
  return prisma.apiPlan.findUnique({
    where: { id: planId },
  });
};

exports.createPlan = async (data) => {
  return prisma.apiPlan.create({
    data: {
      name: data.name,
      provider: data.provider,
      category: data.category,
      costPrice: Number(data.costPrice),
      sellingPrice: Number(data.sellingPrice),
      endpoint: data.endpoint,
      status: data.status || "ACTIVE",
    },
  });
};