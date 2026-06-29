const prisma = require("../config/prisma");

exports.createUsageLog = async ({
  userId,
  apiKeyId = null,
  endpoint,
  method = "POST",
  amount = 0,
  status = "PROCESSING",
  requestBody = null,
  responseBody = null,
  ipAddress = null,
  userAgent = null,
  latency = null,
}) => {
  return prisma.apiUsage.create({
    data: {
      userId,
      apiKeyId,
      endpoint,
      method,
      amount: Number(amount || 0),
      status,
      requestBody: requestBody ? JSON.stringify(requestBody) : null,
      responseBody: responseBody ? JSON.stringify(responseBody) : null,
      ipAddress,
      userAgent,
      latency,
    },
  });
};

exports.updateUsageStatus = async ({
  id,
  status,
  responseBody = null,
  latency = null,
}) => {
  return prisma.apiUsage.update({
    where: { id },
    data: {
      status,
      responseBody: responseBody ? JSON.stringify(responseBody) : null,
      latency,
    },
  });
};

exports.getUsageStats = async ({ userId } = {}) => {
  const where = userId ? { userId } : {};

  const [total, successful, failed, processing, revenue] = await Promise.all([
    prisma.apiUsage.count({ where }),
    prisma.apiUsage.count({ where: { ...where, status: "SUCCESSFUL" } }),
    prisma.apiUsage.count({ where: { ...where, status: "FAILED" } }),
    prisma.apiUsage.count({ where: { ...where, status: "PROCESSING" } }),
    prisma.apiUsage.aggregate({
      where: { ...where, status: "SUCCESSFUL" },
      _sum: { amount: true },
    }),
  ]);

  return {
    total,
    successful,
    failed,
    processing,
    revenue: revenue._sum.amount || 0,
  };
};