const bcrypt = require("bcryptjs");
const prisma = require("../../config/prisma");

// ===============================
// Get All Users
// ===============================
exports.getUsers = async ({
  search,
  role,
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
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                phone: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {},

      role && role !== "ALL"
        ? {
            role,
          }
        : {},

      status && status !== "ALL"
        ? {
            status,
          }
        : {},
    ],
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,

      include: {
        wallet: true,
        apiKeys: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      skip: (page - 1) * limit,

      take: limit,
    }),

    prisma.user.count({
      where,
    }),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// ===============================
// Get User
// ===============================
exports.getUserById = async (id) => {
  return prisma.user.findUnique({
    where: {
      id,
    },

    include: {
      wallet: true,

      apiKeys: true,

      transactions: {
        orderBy: {
          createdAt: "desc",
        },
      },

      walletFundings: true,

      walletWithdrawals: true,

      walletLedgers: {
        orderBy: {
          createdAt: "desc",
        },
      },

      refundRequests: true,

      notifications: true,

      supportTickets: true,

      loginHistory: {
        orderBy: {
          createdAt: "desc",
        },
      },

      activityLogs: {
        orderBy: {
          createdAt: "desc",
        },
      },

      securityLogs: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
};

// ===============================
// Create User
// ===============================
exports.createUser = async (data) => {
  const password = await bcrypt.hash(
    data.password,
    12
  );

  return prisma.user.create({
    data: {
      name: data.name,

      email: data.email,

      phone: data.phone,

      password,

      role: data.role,

      status: "ACTIVE",

      wallet: {
        create: {},
      },

      apiKeys: {
        create: {
          key:
            "ayax_live_" +
            Math.random()
              .toString(36)
              .substring(2) +
            Date.now(),

          name: "Live API Key",
        },
      },
    },

    include: {
      wallet: true,

      apiKeys: true,
    },
  });
};

// ===============================
// Update User
// ===============================
exports.updateUser = async (
  id,
  data
) => {
  return prisma.user.update({
    where: {
      id,
    },

    data,

    include: {
      wallet: true,

      apiKeys: true,
    },
  });
};

// ===============================
// Delete User
// ===============================
exports.deleteUser = async (id) => {
  return prisma.user.delete({
    where: {
      id,
    },
  });
};

// ===============================
// Change Role
// ===============================
exports.changeRole = async (
  id,
  role
) => {
  return prisma.user.update({
    where: {
      id,
    },

    data: {
      role,
    },
  });
};

// ===============================
// Change Status
// ===============================
exports.changeStatus = async (
  id,
  status
) => {
  return prisma.user.update({
    where: {
      id,
    },

    data: {
      status,
    },
  });
};

// ===============================
// Dashboard Statistics
// ===============================
exports.statistics =
  async () => {
    const [
      totalUsers,
      activeUsers,
      admins,
      customers,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.user.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.user.count({
        where: {
          role: "ADMIN",
        },
      }),

      prisma.user.count({
        where: {
          role: "CUSTOMER",
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      admins,
      customers,
    };
  };