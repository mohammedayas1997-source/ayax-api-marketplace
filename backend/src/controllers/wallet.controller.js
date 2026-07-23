const prisma = require("../config/prisma");

const getStartOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStartOfMonth = () => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );
};

const serializeLedger = (item) => ({
  id: item.id,
  reference: item.reference,
  type: item.type,
  amount: Number(item.amount || 0),
  balanceBefore: Number(
    item.balanceBefore || 0
  ),
  balanceAfter: Number(
    item.balanceAfter || 0
  ),
  description: item.description,
  module: item.module,
  createdAt: item.createdAt,
});

exports.getWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    let wallet =
      await prisma.wallet.findUnique({
        where: {
          userId,
        },
      });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    const [
      totalCredit,
      totalDebit,
      todayCredit,
      todayDebit,
      monthlyCredit,
      monthlyDebit,
      recentHistory,
    ] = await Promise.all([
      prisma.walletLedger.aggregate({
        where: {
          userId,
          type: {
            in: [
              "CREDIT",
              "REFUND",
              "REVERSAL",
            ],
          },
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.walletLedger.aggregate({
        where: {
          userId,
          type: {
            in: [
              "DEBIT",
              "ADJUSTMENT",
            ],
          },
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.walletLedger.aggregate({
        where: {
          userId,
          type: {
            in: [
              "CREDIT",
              "REFUND",
              "REVERSAL",
            ],
          },
          createdAt: {
            gte: getStartOfToday(),
          },
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.walletLedger.aggregate({
        where: {
          userId,
          type: {
            in: [
              "DEBIT",
              "ADJUSTMENT",
            ],
          },
          createdAt: {
            gte: getStartOfToday(),
          },
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.walletLedger.aggregate({
        where: {
          userId,
          type: {
            in: [
              "CREDIT",
              "REFUND",
              "REVERSAL",
            ],
          },
          createdAt: {
            gte: getStartOfMonth(),
          },
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.walletLedger.aggregate({
        where: {
          userId,
          type: {
            in: [
              "DEBIT",
              "ADJUSTMENT",
            ],
          },
          createdAt: {
            gte: getStartOfMonth(),
          },
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.walletLedger.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Wallet retrieved successfully.",
      wallet: {
        id: wallet.id,
        balance: Number(
          wallet.balance || 0
        ),
        currency: "NGN",
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
      summary: {
        totalCredit: Number(
          totalCredit._sum.amount || 0
        ),
        totalDebit: Number(
          totalDebit._sum.amount || 0
        ),
        todayCredit: Number(
          todayCredit._sum.amount || 0
        ),
        todayDebit: Number(
          todayDebit._sum.amount || 0
        ),
        monthlyCredit: Number(
          monthlyCredit._sum.amount || 0
        ),
        monthlyDebit: Number(
          monthlyDebit._sum.amount || 0
        ),
      },
      history: recentHistory.map(
        serializeLedger
      ),
    });
  } catch (error) {
    console.error(
      "Get wallet error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve wallet.",
    });
  }
};

exports.getWalletTransactions = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    const {
      type,
      module,
      search,
      startDate,
      endDate,
    } = req.query;

    const where = {
      userId,
    };

    if (type) {
      const normalizedType =
        String(type)
          .trim()
          .toUpperCase();

      const allowedTypes = [
        "CREDIT",
        "DEBIT",
        "REFUND",
        "REVERSAL",
        "ADJUSTMENT",
      ];

      if (
        !allowedTypes.includes(
          normalizedType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid wallet transaction type.",
        });
      }

      where.type = normalizedType;
    }

    if (module) {
      where.module = {
        contains: String(module).trim(),
        mode: "insensitive",
      };
    }

    if (search) {
      const searchValue =
        String(search).trim();

      where.OR = [
        {
          reference: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
        {
          module: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        const parsedStart =
          new Date(startDate);

        if (
          Number.isNaN(
            parsedStart.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid startDate.",
          });
        }

        where.createdAt.gte =
          parsedStart;
      }

      if (endDate) {
        const parsedEnd =
          new Date(endDate);

        if (
          Number.isNaN(
            parsedEnd.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid endDate.",
          });
        }

        parsedEnd.setHours(
          23,
          59,
          59,
          999
        );

        where.createdAt.lte =
          parsedEnd;
      }
    }

    const [
      transactions,
      total,
      creditAggregate,
      debitAggregate,
    ] = await Promise.all([
      prisma.walletLedger.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.walletLedger.count({
        where,
      }),

      prisma.walletLedger.aggregate({
        where: {
          ...where,
          type: {
            in: [
              "CREDIT",
              "REFUND",
              "REVERSAL",
            ],
          },
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.walletLedger.aggregate({
        where: {
          ...where,
          type: {
            in: [
              "DEBIT",
              "ADJUSTMENT",
            ],
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalPages =
      Math.max(
        Math.ceil(total / limit),
        1
      );

    return res.status(200).json({
      success: true,
      message:
        "Wallet transactions retrieved successfully.",
      transactions:
        transactions.map(
          serializeLedger
        ),
      summary: {
        totalTransactions: total,
        totalCredit: Number(
          creditAggregate._sum
            .amount || 0
        ),
        totalDebit: Number(
          debitAggregate._sum
            .amount || 0
        ),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },
    });
  } catch (error) {
    console.error(
      "Get wallet transactions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve wallet transactions.",
    });
  }
};