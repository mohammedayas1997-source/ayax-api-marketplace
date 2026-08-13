const prisma = require("../../config/prisma");

// ====================================
// Get Plans
// ====================================

exports.getPlans = async ({
  search,
  status,
  serviceId,
  category,
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
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                code: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {},

      status && status !== "ALL"
        ? { status }
        : {},

      serviceId
        ? { serviceId }
        : {},

      category && category !== "ALL"
        ? { category }
        : {},
    ],
  };

  const [plans, total] =
    await Promise.all([

      prisma.apiPlan.findMany({

        where,

        include: {
          service: {
            include: {
              provider: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        skip:
          (page - 1) * limit,

        take: limit,
      }),

      prisma.apiPlan.count({
        where,
      }),
    ]);

  return {

    plans,

    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(
        total / limit
      ),
    },
  };
};

// ====================================

exports.getPlanById = async (
  id
) => {

  return prisma.apiPlan.findUnique({

    where: { id },

    include: {
      service: {
        include: {
          provider: true,
        },
      },
    },
  });
};

// ====================================

exports.createPlan =
  async (data) => {

    const exists =
      await prisma.apiPlan.findUnique({
        where: {
          code: data.code,
        },
      });

    if (exists) {
      throw new Error(
        "Plan code already exists"
      );
    }

    return prisma.apiPlan.create({

      data,

      include: {
        service: {
          include: {
            provider: true,
          },
        },
      },
    });
};

// ====================================

exports.updatePlan =
  async (id, data) => {

    return prisma.apiPlan.update({

      where: { id },

      data,

      include: {
        service: {
          include: {
            provider: true,
          },
        },
      },
    });
};

// ====================================

exports.deletePlan =
  async (id) => {

    return prisma.apiPlan.delete({

      where: { id },
    });
};

// ====================================

exports.changeStatus =
  async (id, status) => {

    return prisma.apiPlan.update({

      where: { id },

      data: {
        status,
      },
    });
};

// ====================================

exports.statistics =
  async () => {

    const [

      total,

      active,

      disabled,

    ] =
      await Promise.all([

        prisma.apiPlan.count(),

        prisma.apiPlan.count({
          where: {
            status: "ACTIVE",
          },
        }),

        prisma.apiPlan.count({
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