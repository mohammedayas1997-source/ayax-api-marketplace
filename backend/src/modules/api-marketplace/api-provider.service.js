const prisma = require("../../config/prisma");

// ===============================
// Get Providers
// ===============================
exports.getProviders = async ({
  search,
  status,
  page = 1,
  limit = 10,
}) => {
  page = Number(page);
  limit = Number(limit);

  const where = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { baseUrl: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      status && status !== "ALL" ? { status } : {},
    ],
  };

  const [providers, total] = await Promise.all([
    prisma.apiProvider.findMany({
      where,
      include: {
        services: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.apiProvider.count({ where }),
  ]);

  return {
    providers,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// ===============================
// Get Provider By ID
// ===============================
exports.getProviderById = async (id) => {
  return prisma.apiProvider.findUnique({
    where: { id },
    include: {
      services: {
        include: {
          plans: true,
        },
      },
    },
  });
};

// ===============================
// Create Provider
// ===============================
exports.createProvider = async (data) => {
  const exists = await prisma.apiProvider.findUnique({
    where: { slug: data.slug },
  });

  if (exists) {
    throw new Error("Provider slug already exists");
  }

  return prisma.apiProvider.create({
    data: {
      name: data.name,
      slug: data.slug,
      baseUrl: data.baseUrl,
      apiKey: data.apiKey || null,
      secretKey: data.secretKey || null,
      description: data.description || null,
      status: data.status || "ACTIVE",
    },
  });
};

// ===============================
// Update Provider
// ===============================
exports.updateProvider = async (id, data) => {
  if (data.slug) {
    const exists = await prisma.apiProvider.findFirst({
      where: {
        slug: data.slug,
        NOT: { id },
      },
    });

    if (exists) {
      throw new Error("Provider slug already exists");
    }
  }

  return prisma.apiProvider.update({
    where: { id },
    data,
  });
};

// ===============================
// Delete Provider
// ===============================
exports.deleteProvider = async (id) => {
  return prisma.apiProvider.delete({
    where: { id },
  });
};

// ===============================
// Change Provider Status
// ===============================
exports.changeStatus = async (id, status) => {
  return prisma.apiProvider.update({
    where: { id },
    data: { status },
  });
};

// ===============================
// Provider Statistics
// ===============================
exports.statistics = async () => {
  const [total, active, disabled, maintenance] = await Promise.all([
    prisma.apiProvider.count(),
    prisma.apiProvider.count({ where: { status: "ACTIVE" } }),
    prisma.apiProvider.count({ where: { status: "DISABLED" } }),
    prisma.apiProvider.count({ where: { status: "MAINTENANCE" } }),
  ]);

  return {
    total,
    active,
    disabled,
    maintenance,
  };
};