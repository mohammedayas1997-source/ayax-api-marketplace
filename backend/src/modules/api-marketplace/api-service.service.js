const prisma = require("../../config/prisma");

exports.getServices = async ({ search, status, providerId, category, page = 1, limit = 10 }) => {
  page = Number(page);
  limit = Number(limit);

  const where = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { endpoint: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      status && status !== "ALL" ? { status } : {},
      providerId ? { providerId } : {},
      category && category !== "ALL" ? { category } : {},
    ],
  };

  const [services, total] = await Promise.all([
    prisma.apiService.findMany({
      where,
      include: {
        provider: true,
        plans: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.apiService.count({ where }),
  ]);

  return {
    services,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

exports.getServiceById = async (id) => {
  return prisma.apiService.findUnique({
    where: { id },
    include: {
      provider: true,
      plans: true,
    },
  });
};

exports.createService = async (data) => {
  const exists = await prisma.apiService.findUnique({
    where: { slug: data.slug },
  });

  if (exists) {
    throw new Error("Service slug already exists");
  }

  return prisma.apiService.create({
    data: {
      providerId: data.providerId,
      name: data.name,
      slug: data.slug,
      category: data.category,
      endpoint: data.endpoint,
      method: data.method || "POST",
      status: data.status || "ACTIVE",
      description: data.description || null,
    },
    include: {
      provider: true,
      plans: true,
    },
  });
};

exports.updateService = async (id, data) => {
  if (data.slug) {
    const exists = await prisma.apiService.findFirst({
      where: {
        slug: data.slug,
        NOT: { id },
      },
    });

    if (exists) {
      throw new Error("Service slug already exists");
    }
  }

  return prisma.apiService.update({
    where: { id },
    data,
    include: {
      provider: true,
      plans: true,
    },
  });
};

exports.deleteService = async (id) => {
  return prisma.apiService.delete({
    where: { id },
  });
};

exports.changeStatus = async (id, status) => {
  return prisma.apiService.update({
    where: { id },
    data: { status },
    include: {
      provider: true,
      plans: true,
    },
  });
};

exports.statistics = async () => {
  const [total, active, disabled, maintenance] = await Promise.all([
    prisma.apiService.count(),
    prisma.apiService.count({ where: { status: "ACTIVE" } }),
    prisma.apiService.count({ where: { status: "DISABLED" } }),
    prisma.apiService.count({ where: { status: "MAINTENANCE" } }),
  ]);

  return { total, active, disabled, maintenance };
};