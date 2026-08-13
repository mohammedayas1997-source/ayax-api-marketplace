const prisma = require("../config/prisma");

exports.getRefundById = async (refundId) => {
  return prisma.refundRequest.findUnique({
    where: { id: refundId },
  });
};

exports.approveRefundToWallet = async (refund) => {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.update({
      where: { userId: refund.userId },
      data: {
        balance: {
          increment: Number(refund.amount),
        },
      },
    });

    const updatedRefund = await tx.refundRequest.update({
      where: { id: refund.id },
      data: {
        status: "APPROVED",
        adminPinUsed: true,
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        reference: `REFUND-${refund.id}`,
        userId: refund.userId,
        type: "CREDIT",
        service: "REFUND",
        amount: Number(refund.amount),
        status: "SUCCESSFUL",
        description: `Refund approved for transaction ${refund.transactionId}`,
      },
    });

    return {
      wallet,
      refund: updatedRefund,
      transaction,
    };
  });
};