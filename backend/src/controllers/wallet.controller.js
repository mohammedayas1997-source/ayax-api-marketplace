const crypto = require("crypto");

const prisma = require("../config/prisma");

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:3000";

const PAYSTACK_BASE_URL =
  "https://api.paystack.co";

/* ======================================================
   HELPERS
====================================================== */

const {
  sendWalletFundedNotification,
} = require("../services/notification.service");

const {
  sendWalletFundingEmail,
} = require("../services/accountEmail.service");

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

const generateReference = (
  prefix = "AYAX-WALLET"
) => {
  const randomValue = crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase();

  return `${prefix}-${Date.now()}-${randomValue}`;
};

const parseAmount = (value) => {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  return Number(amount.toFixed(2));
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

const serializeFunding = (item) => ({
  id: item.id,
  amount: Number(item.amount || 0),
  reference: item.reference,
  paymentReference:
    item.paymentReference,
  channel: item.channel,
  proofUrl: item.proofUrl,
  status: item.status,
  note: item.note,
  approvedBy: item.approvedBy,
  rejectedBy: item.rejectedBy,
  approvedAt: item.approvedAt,
  rejectedAt: item.rejectedAt,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const getOrCreateWallet = async (
  userId,
  transactionClient = prisma
) => {
  let wallet =
    await transactionClient.wallet.findUnique({
      where: {
        userId,
      },
    });

  if (!wallet) {
    wallet =
      await transactionClient.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
  }

  return wallet;
};

const createAuditLog = async ({
  req,
  userId,
  userEmail,
  action,
  description,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        action,
        module: "WALLET",
        description,
        ipAddress: req?.ip || null,
      },
    });
  } catch (error) {
    console.error(
      "Wallet audit log error:",
      error.message
    );
  }
};

const creditWalletFromPaystack =
  async ({
    userId,
    amount,
    fundingReference,
    paymentReference,
  }) => {
    return prisma.$transaction(
      async (tx) => {
        const funding =
          await tx.walletFunding.findUnique({
            where: {
              reference:
                fundingReference,
            },
          });

        if (!funding) {
          throw new Error(
            "Funding record not found."
          );
        }

        if (
          funding.userId !== userId
        ) {
          throw new Error(
            "Funding request does not belong to this user."
          );
        }
        const user = await tx.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        if (
          funding.status === "APPROVED"
        ) {
          const existingWallet =
            await getOrCreateWallet(
              userId,
              tx
            );

          return {
            alreadyProcessed: true,
            wallet: existingWallet,
            funding,
          };
        }

        const wallet =
          await getOrCreateWallet(
            userId,
            tx
          );

        const balanceBefore =
          Number(wallet.balance || 0);

        const balanceAfter =
          Number(
            (
              balanceBefore +
              Number(amount)
            ).toFixed(2)
          );

        const ledgerReference =
          `PAYSTACK-${fundingReference}`;

        const existingLedger =
          await tx.walletLedger.findUnique({
            where: {
              reference:
                ledgerReference,
            },
          });

        if (existingLedger) {
          const updatedFunding =
            await tx.walletFunding.update({
              where: {
                id: funding.id,
              },
              data: {
                status: "APPROVED",
                approvedAt:
                  funding.approvedAt ||
                  new Date(),
                paymentReference:
                  paymentReference ||
                  funding.paymentReference,
                channel:
                  funding.channel ||
                  "PAYSTACK",
              },
            });

          return {
            alreadyProcessed: true,
            wallet,
            funding:
              updatedFunding,
          };
        }

        const updatedWallet =
          await tx.wallet.update({
            where: {
              userId,
            },
            data: {
              balance: balanceAfter,
            },
          });

        const updatedFunding =
          await tx.walletFunding.update({
            where: {
              id: funding.id,
            },
            data: {
              status: "APPROVED",
              approvedAt: new Date(),
              paymentReference:
                paymentReference ||
                funding.paymentReference,
              channel: "PAYSTACK",
            },
          });

        await tx.walletLedger.create({
          data: {
            userId,
            reference:
              ledgerReference,
            type: "CREDIT",
            amount: Number(amount),
            balanceBefore,
            balanceAfter,
            description:
              "Wallet funding through Paystack",
            module: "PAYSTACK",
          },
        });

        await tx.transaction.create({
          data: {
            userId,
            reference:
              fundingReference,
            type: "CREDIT",
            service:
              "WALLET_FUNDING",
            amount: Number(amount),
            status: "SUCCESSFUL",
            description:
              "Wallet funded through Paystack",
          },
        }).catch((error) => {
          if (
            error?.code !== "P2002"
          ) {
            throw error;
          }
        });

        const walletPayload = {
          userId,
          balance: Number(updatedWallet.balance || 0),
          fundedAmount: Number(amount),
          reference: fundingReference,
          transactionType: "CREDIT",
          updatedAt: new Date(),
        };

        return {
          alreadyProcessed: false,
          wallet: updatedWallet,
          funding: updatedFunding,
          user,
          previousBalance: balanceBefore,
          newBalance: balanceAfter,
          amount: Number(amount),
          reference: fundingReference,
          walletPayload,
        };
      }
    );
  };

/* ======================================================
   GET WALLET
   GET /api/v1/wallet
====================================================== */

exports.getWallet = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const wallet =
      await getOrCreateWallet(userId);

    const todayStart =
      getStartOfToday();

    const monthStart =
      getStartOfMonth();

    const [
      totalCredit,
      totalDebit,
      todayCredit,
      todayDebit,
      monthlyCredit,
      monthlyDebit,
      recentHistory,
      pendingFundings,
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
            gte: todayStart,
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
            gte: todayStart,
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
            gte: monthStart,
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
            gte: monthStart,
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

      prisma.walletFunding.count({
        where: {
          userId,
          status: "PENDING",
        },
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
        createdAt:
          wallet.createdAt,
        updatedAt:
          wallet.updatedAt,
      },
      balance: Number(
        wallet.balance || 0
      ),
      currency: "NGN",
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
        pendingFundings,
      },
      history:
        recentHistory.map(
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

/* ======================================================
   WALLET TRANSACTIONS
   GET /api/v1/wallet/transactions
====================================================== */

exports.getWalletTransactions =
  async (req, res) => {
    try {
      const userId = req.user.id;

      const page = Math.max(
        Number(req.query.page) || 1,
        1
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit) ||
            20,
          1
        ),
        100
      );

      const skip =
        (page - 1) * limit;

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
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid wallet transaction type.",
            });
        }

        where.type =
          normalizedType;
      }

      if (module) {
        where.module = {
          contains: String(
            module
          ).trim(),
          mode: "insensitive",
        };
      }

      if (search) {
        const searchValue =
          String(search).trim();

        where.OR = [
          {
            reference: {
              contains:
                searchValue,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains:
                searchValue,
              mode: "insensitive",
            },
          },
          {
            module: {
              contains:
                searchValue,
              mode: "insensitive",
            },
          },
        ];
      }

      if (
        startDate ||
        endDate
      ) {
        where.createdAt = {};

        if (startDate) {
          const parsedStart =
            new Date(startDate);

          if (
            Number.isNaN(
              parsedStart.getTime()
            )
          ) {
            return res
              .status(400)
              .json({
                success: false,
                message:
                  "Invalid startDate.",
              });
          }

          parsedStart.setHours(
            0,
            0,
            0,
            0
          );

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
            return res
              .status(400)
              .json({
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
        history:
          transactions.map(
            serializeLedger
          ),
        summary: {
          totalTransactions:
            total,
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

exports.getMyTransactions =
  exports.getWalletTransactions;

/* ======================================================
   MANUAL FUNDING REQUEST
   POST /api/v1/wallet/fund
====================================================== */

exports.createFundingRequest =
  async (req, res) => {
    try {
      const userId = req.user.id;

      const amount =
        parseAmount(req.body.amount);

      const channel =
        String(
          req.body.channel ||
            "BANK_TRANSFER"
        )
          .trim()
          .toUpperCase();

      const proofUrl =
        req.body.proofUrl
          ? String(
              req.body.proofUrl
            ).trim()
          : null;

      const note =
        req.body.note
          ? String(
              req.body.note
            ).trim()
          : null;

      if (!amount) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid funding amount.",
        });
      }

      if (amount < 10000) {
        return res.status(400).json({
          success: false,
          message:
            "Minimum funding amount is ₦10,000.",
        });
      }

      const reference =
        generateReference(
          "AYAX-FUND"
        );

      const funding =
        await prisma.walletFunding.create({
          data: {
            userId,
            amount,
            reference,
            channel,
            proofUrl,
            note,
            status: "PENDING",
          },
        });

      await createAuditLog({
        req,
        userId,
        userEmail:
          req.user?.email,
        action:
          "CREATE_FUNDING_REQUEST",
        description: `Created wallet funding request ${reference} for NGN ${amount}`,
      });

      return res.status(201).json({
        success: true,
        message:
          "Wallet funding request submitted successfully.",
        funding:
          serializeFunding(funding),
      });
    } catch (error) {
      console.error(
        "Create funding request error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to create funding request.",
      });
    }
  };

/* ======================================================
   MY FUNDING REQUESTS
   GET /api/v1/wallet/funding-requests
====================================================== */

exports.getMyFundingRequests =
  async (req, res) => {
    try {
      const userId = req.user.id;

      const page = Math.max(
        Number(req.query.page) || 1,
        1
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit) ||
            20,
          1
        ),
        100
      );

      const skip =
        (page - 1) * limit;

      const where = {
        userId,
      };

      if (req.query.status) {
        const status = String(
          req.query.status
        )
          .trim()
          .toUpperCase();

        const statuses = [
          "PENDING",
          "APPROVED",
          "REJECTED",
          "CANCELLED",
        ];

        if (
          !statuses.includes(status)
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid funding status.",
            });
        }

        where.status = status;
      }

      const [
        fundingRequests,
        total,
      ] = await Promise.all([
        prisma.walletFunding.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),

        prisma.walletFunding.count({
          where,
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
          "Funding requests retrieved successfully.",
        fundingRequests:
          fundingRequests.map(
            serializeFunding
          ),
        requests:
          fundingRequests.map(
            serializeFunding
          ),
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
        "Get funding requests error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve funding requests.",
      });
    }
  };

/* ======================================================
   INITIALIZE PAYSTACK
   POST /api/v1/wallet/paystack/initialize
====================================================== */

exports.initializePaystackFunding =
  async (req, res) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message:
            "Paystack secret key is not configured.",
        });
      }

      const userId = req.user.id;

      const amount =
        parseAmount(req.body.amount);

      if (!amount) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid funding amount.",
        });
      }

      if (amount < 10000) {
        return res.status(400).json({
          success: false,
          message:
            "Minimum Paystack funding amount is ₦10,000.",
        });
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User account not found.",
        });
      }

      if (!user.email) {
        return res.status(400).json({
          success: false,
          message:
            "A valid email address is required for Paystack funding.",
        });
      }

      const reference =
        generateReference(
          "AYAX-PAYSTACK"
        );

      const callbackUrl =
        req.body.callbackUrl ||
        `${FRONTEND_URL}/dashboard/wallet?reference=${reference}`;

      const funding =
        await prisma.walletFunding.create({
          data: {
            userId,
            amount,
            reference,
            paymentReference:
              reference,
            channel: "PAYSTACK",
            status: "PENDING",
          },
        });

      const paystackResponse =
        await fetch(
          `${PAYSTACK_BASE_URL}/transaction/initialize`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email: user.email,
              amount: Math.round(
                amount * 100
              ),
              reference,
              callback_url:
                callbackUrl,
              currency: "NGN",
              metadata: {
                userId,
                fundingId:
                  funding.id,
                fundingReference:
                  reference,
                customerName:
                  user.name,
                purpose:
                  "WALLET_FUNDING",
              },
            }),
          }
        );

      const result =
        await paystackResponse.json();

      if (
        !paystackResponse.ok ||
        !result.status
      ) {
        await prisma.walletFunding.update({
          where: {
            id: funding.id,
          },
          data: {
            status: "CANCELLED",
            note:
              result.message ||
              "Paystack initialization failed.",
          },
        });

        return res.status(400).json({
          success: false,
          message:
            result.message ||
            "Unable to initialize Paystack payment.",
        });
      }

      await createAuditLog({
        req,
        userId,
        userEmail: user.email,
        action:
          "INITIALIZE_PAYSTACK_FUNDING",
        description: `Initialized Paystack wallet funding ${reference} for NGN ${amount}`,
      });

      return res.status(200).json({
        success: true,
        message:
          "Paystack payment initialized successfully.",
        authorizationUrl:
          result.data
            .authorization_url,
        accessCode:
          result.data.access_code,
        reference:
          result.data.reference,
        funding:
          serializeFunding(funding),
        data: {
          authorizationUrl:
            result.data
              .authorization_url,
          authorization_url:
            result.data
              .authorization_url,
          accessCode:
            result.data
              .access_code,
          access_code:
            result.data
              .access_code,
          reference:
            result.data.reference,
        },
      });
    } catch (error) {
      console.error(
        "Initialize Paystack error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to initialize Paystack funding.",
      });
    }
  };

/* ======================================================
   VERIFY PAYSTACK
   GET /api/v1/wallet/paystack/verify/:reference
====================================================== */

exports.verifyPaystackFunding =
  async (req, res) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message:
            "Paystack secret key is not configured.",
        });
      }

      const userId = req.user.id;

      const reference =
        String(
          req.params.reference || ""
        ).trim();

      if (!reference) {
        return res.status(400).json({
          success: false,
          message:
            "Payment reference is required.",
        });
      }

      const funding =
        await prisma.walletFunding.findFirst({
          where: {
            userId,
            OR: [
              {
                reference,
              },
              {
                paymentReference:
                  reference,
              },
            ],
          },
        });

      if (!funding) {
        return res.status(404).json({
          success: false,
          message:
            "Wallet funding record not found.",
        });
      }

      if (
        funding.status === "APPROVED"
      ) {
        const wallet =
          await getOrCreateWallet(userId);

        return res.status(200).json({
          success: true,
          message:
            "Payment was already verified and credited.",
          alreadyProcessed: true,
          wallet: {
            balance: Number(
              wallet.balance || 0
            ),
            currency: "NGN",
          },
          funding:
            serializeFunding(funding),
        });
      }

      const paystackResponse =
        await fetch(
          `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(
            reference
          )}`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${PAYSTACK_SECRET_KEY}`,
              Accept:
                "application/json",
            },
          }
        );

      const result =
        await paystackResponse.json();

      if (
        !paystackResponse.ok ||
        !result.status
      ) {
        return res.status(400).json({
          success: false,
          message:
            result.message ||
            "Unable to verify Paystack payment.",
        });
      }

      const transactionData =
        result.data;

      if (
        transactionData.status !==
        "success"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment has not been completed successfully.",
          paymentStatus:
            transactionData.status,
        });
      }

      const paidAmount =
        Number(
          transactionData.amount
        ) / 100;

      if (
        Number(paidAmount.toFixed(2)) !==
        Number(
          funding.amount.toFixed(2)
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount does not match the funding request.",
        });
      }

      const credited =
        await creditWalletFromPaystack({
          userId,
          amount: paidAmount,
          fundingReference:
            funding.reference,
          paymentReference:
            transactionData.reference,
        });

      if (!credited.alreadyProcessed) {
        await sendWalletFundedNotification({
          user: credited.user,
          amount: paidAmount,
          balance: credited.wallet.balance,
          reference: funding.reference,
        });

        sendWalletFundingEmail({
          user: credited.user,
          amount: credited.amount,
          previousBalance:
            credited.previousBalance,
          newBalance:
            credited.newBalance,
          reference:
            credited.reference,
          paymentReference:
            credited.funding.paymentReference,
          channel:
            credited.funding.channel ||
            "PAYSTACK",
          fundedAt:
            credited.funding.approvedAt ||
            new Date(),
        }).catch((error) => {
          console.error(
            "Wallet funding email error:",
            error.message
          );
        });
      }

      await createAuditLog({
        req,
        userId,
        userEmail:
          req.user?.email,
        action:
          "VERIFY_PAYSTACK_FUNDING",
        description: `Verified and credited Paystack wallet funding ${funding.reference}`,
      });

      return res.status(200).json({
        success: true,
        message:
          credited.alreadyProcessed
            ? "Payment was already processed."
            : "Wallet funded successfully.",
        alreadyProcessed:
          credited.alreadyProcessed,
        wallet: {
          balance: Number(
            credited.wallet.balance ||
              0
          ),
          currency: "NGN",
        },
        funding:
          serializeFunding(
            credited.funding
          ),
      });
    } catch (error) {
      console.error(
        "Verify Paystack error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify Paystack payment.",
      });
    }
  };