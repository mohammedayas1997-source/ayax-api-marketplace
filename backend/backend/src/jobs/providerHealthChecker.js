const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

const checkProviderHealth = async (provider) => {
  try {
    if (!provider.baseUrl) {
      return {
        status: "WARNING",
        message: "Provider base URL is missing",
      };
    }

    return {
      status: "HEALTHY",
      message: "Provider configuration looks valid",
    };
  } catch (error) {
    return {
      status: "CRITICAL",
      message: error.message,
    };
  }
};

exports.runProviderHealthChecker = async () => {
  const providers = await prisma.apiProvider.findMany();

  const results = [];

  for (const provider of providers) {
    const health = await checkProviderHealth(provider);

    results.push({
      providerId: provider.id,
      providerName: provider.name,
      ...health,
    });

    if (health.status === "CRITICAL") {
      emitEvent("provider-health-critical", {
        providerId: provider.id,
        providerName: provider.name,
        message: health.message,
      });
    }
  }

  return results;
};