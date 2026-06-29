const prisma = require("../config/prisma");
const generateReference = require("../helpers/generateReference");

exports.createTransaction = async ({
  userId,
  type,
  service,
  amount,
  status = "PENDING",
  description = "",
  reference,
}) => {
  return prisma.transaction.create({
    data: {
      reference: reference || generateReference("TRX"),
      userId,
      type,
      service,
      amount: Number(amount || 0),
      status,
      description,
    },
  });
};

exports.updateTransactionStatus = async ({
  reference,
  status,
  description,
}) => {
  return prisma.transaction.update({
    where: { reference },
    data: {
      status,
      description,
    },
  });
};

exports.getTransactionByReference = async (reference) => {
  return prisma.transaction.findUnique({
    where: { reference },
    include: {
      user: {
        include: {
          wallet: true,
        },
      },
    },
  });
};