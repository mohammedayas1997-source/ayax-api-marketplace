const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");
const createAuditLog = require("../utils/audit");

exports.createRefundRequest = async (req, res) => {
  try {
    const { transactionId, amount, reason } = req.body;

    const refund = await prisma.refundRequest.create({
      data: {
        transactionId,
        amount: Number(amount),
        reason,
        userId: req.user.id,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    await createAuditLog({
      user: req.user,
      action: "CREATE_REFUND_REQUEST",
      module: "REFUND",
      description: `Refund request ${refund.id} created`,
      ip: req.ip,
    });

    emitEvent("refund-request-created", {
      message: "New refund request",
      refund,
    });

    return res.status(201).json({
      success: true,
      message: "Refund request created successfully",
      refund,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getRefundRequests = async (req, res) => {
  try {
    const refunds = await prisma.refundRequest.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      refunds,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.approveRefund = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { adminPin } = req.body;

    const pin = process.env.ADMIN_PIN || process.env.SUPER_ADMIN_PIN || "123456";

    if (String(adminPin) !== String(pin)) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin pin",
      });
    }

    const refund = await prisma.refundRequest.findUnique({
      where: {
        id: refundId,
      },
    });

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund request not found",
      });
    }

    if (refund.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Refund request has already been processed",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: {
          userId: refund.userId,
        },
        update: {
          balance: {
            increment: refund.amount,
          },
        },
        create: {
          userId: refund.userId,
          balance: refund.amount,
        },
      });

      const updatedRefund = await tx.refundRequest.update({
        where: {
          id: refund.id,
        },
        data: {
          status: "APPROVED",
          adminPinUsed: true,
          approvedBy: req.user?.id || null,
          approvedAt: new Date(),
        },
      });

      return { wallet, refund: updatedRefund };
    });

    await createAuditLog({
      user: req.user,
      action: "APPROVE_REFUND",
      module: "REFUND",
      description: `Refund ${refund.id} approved`,
      ip: req.ip,
    });

    emitEvent("refund-approved", {
      message: "Refund approved",
      refundId,
    });

    return res.json({
      success: true,
      message: "Refund approved successfully",
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.rejectRefund = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { rejectionNote } = req.body;

    const refund = await prisma.refundRequest.findUnique({
      where: {
        id: refundId,
      },
    });

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund request not found",
      });
    }

    if (refund.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Refund request has already been processed",
      });
    }

    const updatedRefund = await prisma.refundRequest.update({
      where: {
        id: refundId,
      },
      data: {
        status: "REJECTED",
        rejectedBy: req.user?.id || null,
        rejectedAt: new Date(),
        rejectionNote: rejectionNote || "Refund rejected",
      },
    });

    await createAuditLog({
      user: req.user,
      action: "REJECT_REFUND",
      module: "REFUND",
      description: `Refund ${refund.id} rejected`,
      ip: req.ip,
    });

    emitEvent("refund-rejected", {
      message: "Refund rejected",
      refundId,
    });

    return res.json({
      success: true,
      message: "Refund rejected successfully",
      refund: updatedRefund,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};