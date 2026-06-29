const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");
exports.getFundingRequests = async (req, res) => {
  try {
    const requests = await prisma.fundingRequest.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveFunding = async (req, res) => {
  try {
    const { fundingId } = req.params;

    const funding = await prisma.fundingRequest.findUnique({
      where: { id: fundingId },
      include: { user: true },
    });
    await createAuditLog({
  user: req.user,
  action: "APPROVE_FUNDING",
  module: "WALLET",
  description: `Funding request approved`,
  ip: req.ip,
});
emitEvent("funding-approved", {
  message: "Funding approved",
  result,
});

    if (!funding) {
      return res.status(404).json({
        success: false,
        message: "Funding request not found",
      });
    }

    if (funding.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Funding request already processed",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { userId: funding.userId },
        data: {
          balance: {
            increment: funding.amount,
          },
        },
      });

      const updatedFunding = await tx.fundingRequest.update({
        where: { id: funding.id },
        data: { status: "APPROVED" },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference: funding.reference,
          userId: funding.userId,
          type: "CREDIT",
          service: "WALLET_FUNDING",
          amount: funding.amount,
          status: "SUCCESSFUL",
          description: `Wallet funding approved by admin`,
        },
      });

      return { wallet, updatedFunding, transaction };
    });

    return res.json({
      success: true,
      message: "Wallet funded successfully",
      result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectFunding = async (req, res) => {
  try {
    const { fundingId } = req.params;

    const funding = await prisma.fundingRequest.findUnique({
      where: { id: fundingId },
    });

    if (!funding) {
      return res.status(404).json({
        success: false,
        message: "Funding request not found",
      });
    }

    if (funding.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Funding request already processed",
      });
    }
    emitEvent("funding-rejected", {
  message: "Funding rejected",
  funding: updatedFunding,
});

    const updatedFunding = await prisma.fundingRequest.update({
      where: { id: fundingId },
      data: { status: "REJECTED" },
    });

    return res.json({
      success: true,
      message: "Funding request rejected",
      funding: updatedFunding,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
exports.changeUserRole = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user =
      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};