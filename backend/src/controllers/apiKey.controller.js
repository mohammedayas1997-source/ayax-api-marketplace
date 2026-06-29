const crypto = require("crypto");
const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");
exports.getApiKeys = async (req, res) => {
  const keys = await prisma.apiKey.findMany({
    where: {
      userId: req.user.id,
    },
  });

  res.json({
    success: true,
    keys,
  });
};

exports.generateApiKey = async (
  req,
  res
) => {
  const key =
    "ayax_live_" +
    crypto.randomBytes(24).toString("hex");

    await createAuditLog({
  user: req.user,
  action: "CREATE_API_KEY",
  module: "API_KEYS",
  description: "Generated new API key",
  ip: req.ip,
});

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: req.user.id,
      key,
    },
  });

  res.json({
    success: true,
    apiKey,
  });
};

exports.revokeApiKey = async (
  req,
  res
) => {
  await prisma.apiKey.update({
    where: {
      id: req.params.id,
    },
    data: {
      status: "revoked",
    },
  });

  res.json({
    success: true,
  });
};
