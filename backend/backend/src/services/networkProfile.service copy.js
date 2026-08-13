const prisma = require("../config/prisma");

exports.getNetworkProfile = async (network) => {
  const profile = await prisma.networkProfile.findUnique({
    where: { network: String(network).toUpperCase() },
  });

  if (!profile || !profile.enabled) {
    throw new Error(`${network} network profile is not configured`);
  }

  return profile;
};

exports.buildTemplate = (template, values = {}) => {
  if (!template) {
    throw new Error("Template is not configured");
  }

  let result = template;

  Object.keys(values).forEach((key) => {
    result = result.replaceAll(`{${key}}`, String(values[key]));
  });

  return result;
};