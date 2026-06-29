const prisma = require("../../config/prisma");

exports.getUsageLogs = async ({
  search,
  status,
  userId,
  page = 1,
  limit = 20,
}) => {
  page = Number(page);
  limit = Number(limit);

  const where = {
    AND: [
      userId ? { userId } : {},
      status && status !== "ALL" ? { status } : {},
      search
        ? {
            OR: [
              { endpoint: { contains: search, mode: "insensitive" } },
              { method: { contains: search, mode: "insensitive" } },
              { ipAddress: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [usages, total] = await Promise.all([
    prisma.apiUsage.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.apiUsage.count({ where }),
  ]);

  return {
    usages,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

exports.getUsageById = async (id) => {
  return prisma.apiUsage.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });
};

exports.createUsageLog = async (data) => {
  return prisma.apiUsage.create({
    data: {
      userId: data.userId,
      apiKeyId: data.apiKeyId || null,
      endpoint: data.endpoint,
      method: data.method || "POST",
      amount: Number(data.amount || 0),
      status: data.status || "PROCESSING",
      requestBody: data.requestBody
        ? JSON.stringify(data.requestBody)
        : null,
      responseBody: data.responseBody
        ? JSON.stringify(data.responseBody)
        : null,
      ipAddress: data.ipAddress || null,
      latency: data.latency || null,
    },
  });
};

exports.statistics = async () => {
  const [total, successful, failed, processing, revenue] = await Promise.all([
    prisma.apiUsage.count(),

    prisma.apiUsage.count({
      where: { status: "SUCCESSFUL" },
    }),

    prisma.apiUsage.count({
      where: { status: "FAILED" },
    }),

    prisma.apiUsage.count({
      where: { status: "PROCESSING" },
    }),

    prisma.apiUsage.aggregate({
      where: { status: "SUCCESSFUL" },
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