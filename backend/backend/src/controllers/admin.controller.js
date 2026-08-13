const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

// Idan createAuditLog yana wani file,
// ka gyara path ɗin import ɗin nan.
const { createAuditLog } = require("../utils/auditLog");

/**
 * GET ALL FUNDING REQUESTS
 */
exports.getFundingRequests = async (req, res) => {
  try {
    const requests =
      await prisma.fundingRequest.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error(
      "Get funding requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load funding requests.",
    });
  }
};

/**
 * APPROVE FUNDING REQUEST
 */
exports.approveFunding = async (req, res) => {
  try {
    const { fundingId } = req.params;

    const funding =
      await prisma.fundingRequest.findUnique({
        where: {
          id: fundingId,
        },
        include: {
          user: true,
        },
      });

    if (!funding) {
      return res.status(404).json({
        success: false,
        message: "Funding request not found.",
      });
    }

    if (funding.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "Funding request has already been processed.",
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const currentWallet =
            await tx.wallet.findUnique({
              where: {
                userId: funding.userId,
              },
            });

          let wallet;

          if (currentWallet) {
            wallet = await tx.wallet.update({
              where: {
                userId: funding.userId,
              },
              data: {
                balance: {
                  increment: funding.amount,
                },
              },
            });
          } else {
            wallet = await tx.wallet.create({
              data: {
                userId: funding.userId,
                balance: funding.amount,
              },
            });
          }

          const updatedFunding =
            await tx.fundingRequest.update({
              where: {
                id: funding.id,
              },
              data: {
                status: "APPROVED",
              },
            });

          const transaction =
            await tx.transaction.create({
              data: {
                reference:
                  funding.reference,
                userId: funding.userId,
                type: "CREDIT",
                service:
                  "WALLET_FUNDING",
                amount: funding.amount,
                status: "SUCCESSFUL",
                description:
                  "Wallet funding approved by admin.",
              },
            });

          return {
            wallet,
            updatedFunding,
            transaction,
          };
        }
      );

    if (
      typeof createAuditLog === "function"
    ) {
      await createAuditLog({
        user: req.user,
        action: "APPROVE_FUNDING",
        module: "WALLET",
        description: `Funding request ${funding.reference} approved.`,
        ip: req.ip,
      });
    }

    emitEvent("funding-approved", {
      message: "Funding approved.",
      result,
    });

    emitEvent("wallet-updated", {
      userId: funding.userId,
      wallet: result.wallet,
    });

    emitEvent("transaction-updated", {
      transaction: result.transaction,
    });

    return res.json({
      success: true,
      message:
        "Wallet funded successfully.",
      result,
    });
  } catch (error) {
    console.error(
      "Approve funding error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Funding approval failed.",
    });
  }
};

/**
 * REJECT FUNDING REQUEST
 */
exports.rejectFunding = async (req, res) => {
  try {
    const { fundingId } = req.params;

    const funding =
      await prisma.fundingRequest.findUnique({
        where: {
          id: fundingId,
        },
        include: {
          user: true,
        },
      });

    if (!funding) {
      return res.status(404).json({
        success: false,
        message: "Funding request not found.",
      });
    }

    if (funding.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "Funding request has already been processed.",
      });
    }

    const updatedFunding =
      await prisma.fundingRequest.update({
        where: {
          id: fundingId,
        },
        data: {
          status: "REJECTED",
        },
      });

    if (
      typeof createAuditLog === "function"
    ) {
      await createAuditLog({
        user: req.user,
        action: "REJECT_FUNDING",
        module: "WALLET",
        description: `Funding request ${funding.reference} rejected.`,
        ip: req.ip,
      });
    }

    emitEvent("funding-rejected", {
      message: "Funding rejected.",
      funding: updatedFunding,
    });

    return res.json({
      success: true,
      message:
        "Funding request rejected.",
      funding: updatedFunding,
    });
  } catch (error) {
    console.error(
      "Reject funding error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Funding rejection failed.",
    });
  }
};

/**
 * CHANGE USER ROLE
 */
exports.changeUserRole = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const allowedRoles = [
      "SUPER_ADMIN",
      "ADMIN",
      "STAFF_ADMIN",
      "CUSTOMER_SERVICE",
      "CUSTOMER",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role.",
      });
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const user =
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

    if (
      typeof createAuditLog === "function"
    ) {
      await createAuditLog({
        user: req.user,
        action: "CHANGE_USER_ROLE",
        module: "USERS",
        description: `User ${user.email} role changed from ${existingUser.role} to ${role}.`,
        ip: req.ip,
      });
    }

    emitEvent("user-role-updated", {
      message: "User role updated.",
      user,
    });

    return res.json({
      success: true,
      message:
        "User role changed successfully.",
      user,
    });
  } catch (error) {
    console.error(
      "Change user role error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to change user role.",
    });
  }
};