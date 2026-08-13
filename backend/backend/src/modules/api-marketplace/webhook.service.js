const prisma = require("../../config/prisma");

// =====================================
// Get Webhooks
// =====================================
exports.getWebhooks = async ({
  userId,
  status,
  search,
  page = 1,
  limit = 10,
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
              {
                url: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                secret: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {},
    ],
  };

  const [webhooks, total] = await Promise.all([
    prisma.webhook.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.webhook.count({
      where,
    }),
  ]);

  return {
    webhooks,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// =====================================

exports.getWebhook = async (id) => {
  return prisma.webhook.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });
};

// =====================================

exports.createWebhook = async (data) => {
  return prisma.webhook.create({
    data,
    include: {
      user: true,
    },
  });
};

// =====================================

exports.updateWebhook = async (id, data) => {
  return prisma.webhook.update({
    where: { id },
    data,
  });
};

// =====================================

exports.deleteWebhook = async (id) => {
  return prisma.webhook.delete({
    where: { id },
  });
};

// =====================================

exports.statistics = async () => {
  const [total, active, disabled] =
    await Promise.all([
      prisma.webhook.count(),

      prisma.webhook.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.webhook.count({
        where: {
          status: "DISABLED",
        },
      }),
    ]);

  return {
    total,
    active,
    disabled,
  };
};