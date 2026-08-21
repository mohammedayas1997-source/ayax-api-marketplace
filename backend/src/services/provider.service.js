const prisma = require("../config/prisma");
const decryptApiKey = require("../helpers/decryptApiKey");

// Shigo da GSM Gateway Service dinka (ko inda ake aika USSD/SMS ga Android App)
let gsmGatewayService;
try {
  gsmGatewayService = require("./gsmGateway.service"); // ko "./gateway.service"
} catch (e) {
  // Fallback idan sunan ya bambanta
}

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
    throw new Error(`API service '${serviceSlug}' not found in database.`);
  }

  if (service.status !== "ACTIVE") {
    throw new Error(`API service '${serviceSlug}' is disabled.`);
  }

  // Idan babu provider ko an saita shi a matsayin GSM Gateway
  const providerData = service.provider || { name: "GSM_GATEWAY", slug: "gsm_gateway", status: "ACTIVE" };

  return {
    service,
    provider: {
      ...providerData,
      apiKey: providerData.apiKey ? decryptApiKey(providerData.apiKey) : null,
      secretKey: providerData.secretKey ? decryptApiKey(providerData.secretKey) : null,

      // WANNAN SHINE AIKIN DA ZAI TURAWA GSM GATEWAY KAI TSAYE:
      buyAirtime: async ({ network, phone, amount, reference }) => {
        console.log(`📡 Dispatching Airtime to GSM Gateway: ${network} ₦${amount} -> ${phone}`);

        if (gsmGatewayService && typeof gsmGatewayService.processAirtime === "function") {
          return await gsmGatewayService.processAirtime({ network, phone, amount, reference });
        }

        // Idan kuma kana tura command ne kai tsaye ta Prisma zuwa Gateway Queue:
        const sim = await prisma.gatewaySim.findFirst({
          where: { network: String(network).toUpperCase(), status: "ACTIVE" },
        });

        if (!sim) {
          throw new Error(`No active ${network} SIM found on GSM Gateway device.`);
        }

        // Ƙirƙiri USSD/SMS Command a teburin Gateway Commands
        const command = await prisma.gatewayCommand.create({
          data: {
            simId: sim.id,
            type: "USSD",
            status: "PENDING",
            reference,
            payload: JSON.stringify({ phone, amount, network }),
          },
        });

        return {
          success: true,
          message: "Airtime command queued for GSM device",
          commandId: command.id,
        };
      },
    },
  };
};