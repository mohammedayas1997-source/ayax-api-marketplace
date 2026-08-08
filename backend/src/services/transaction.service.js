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

// An kara 'response' ko kuma amfani da 'description' don rike ainihin sakon USSD din
exports.updateTransactionStatus = async ({
  reference,
  status,
  description,
  response,
}) => {
  return prisma.transaction.update({
    where: { reference },
    data: {
      status,
      // Idan akwai response ko message daga app, mu ajiye shi a matsayin description ko response
      description: response || description, 
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