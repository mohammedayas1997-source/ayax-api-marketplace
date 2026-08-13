const prisma = require("../config/prisma");

exports.getNetworkProfile = async (network) => {
  const profile = await prisma.networkProfile.findUnique({
    where: {
      network,
    },
  });

  if (!profile || !profile.enabled) {
    throw new Error(`${network} profile is not configured.`);
  }

  return profile;
};

exports.buildTemplate = (template, values) => {
  let result = template;

  Object.keys(values).forEach((key) => {
    result = result.replaceAll(`{${key}}`, values[key]);
  });

  return result;
};