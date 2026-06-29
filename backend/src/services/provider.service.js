const prisma = require("../config/prisma");
const decryptApiKey = require("../helpers/decryptApiKey");

exports.getActiveProviderBySlug = async (slug) => {
  const provider = await prisma.apiProvider.findUnique({
    where: { slug },
  });

  if (!provider) {
    throw new Error("Provider not found");
  }

  if (provider.status !== "ACTIVE") {
    throw new Error("Provider is not active");
  }

  return {
    ...provider,
    apiKey: decryptApiKey(provider.apiKey),
    secretKey: decryptApiKey(provider.secretKey),
  };
};

exports.getProviderForService = async (serviceSlug) => {
  const service = await prisma.apiService.findUnique({
    where: { slug: serviceSlug },
    include: {
      provider: true,
      plans: true,
    },
  });

  if (!service) {
    throw new Error("API service not found");
  }

  if (service.status !== "ACTIVE") {
    throw new Error("API service is not active");
  }

  if (!service.provider || service.provider.status !== "ACTIVE") {
    throw new Error("Provider is not active");
  }

  return {
    service,
    provider: {
      ...service.provider,
      apiKey: decryptApiKey(service.provider.apiKey),
      secretKey: decryptApiKey(service.provider.secretKey),
    },
  };
};