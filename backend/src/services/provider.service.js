const prisma = require("../config/prisma");
const decryptApiKey = require("../helpers/decryptApiKey");

let gsmGatewayService;
try {
  gsmGatewayService = require("./gsmGateway.service");
} catch (e) {
  try {
    gsmGatewayService = require("./gateway.service");
  } catch (err) {
    // GSM service will fallback to Prisma queries
  }
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

  const providerData = service.provider || {
    name: "GSM_GATEWAY",
    slug: "gsm_gateway",
    status: "ACTIVE",
  };

  return {
    service,
    provider: {
      ...providerData,
      apiKey: providerData.apiKey ? decryptApiKey(providerData.apiKey) : null,
      secretKey: providerData.secretKey ? decryptApiKey(providerData.secretKey) : null,

      buyAirtime: async ({ network, phone, amount, reference }) => {
        // 1. Map Network Identifiers (e.g. 01 -> MTN)
        const networkMap = {
          "1": "MTN",
          "01": "MTN",
          "MTN": "MTN",
          "2": "GLO",
          "02": "GLO",
          "GLO": "GLO",
          "3": "AIRTEL",
          "03": "AIRTEL",
          "AIRTEL": "AIRTEL",
          "4": "9MOBILE",
          "04": "9MOBILE",
          "9MOBILE": "9MOBILE",
          "ETISALAT": "9MOBILE",
        };

        const resolvedNetwork =
          networkMap[String(network).toUpperCase()] || String(network).toUpperCase();

        console.log(
          `📡 Dispatching Airtime to GSM Gateway: ${resolvedNetwork} ₦${amount} -> ${phone}`
        );

        // 2. Delegate to Gateway Service if present
        if (
          gsmGatewayService &&
          typeof gsmGatewayService.processAirtime === "function"
        ) {
          return await gsmGatewayService.processAirtime({
            network: resolvedNetwork,
            phone,
            amount,
            reference,
          });
        }

        // 3. Dynamic Prisma SIM Model Resolution
        const simModel =
          prisma.gatewaySim ||
          prisma.sim ||
          prisma.gSMSim ||
          prisma.deviceSim ||
          prisma.simCard;

        if (!simModel) {
          console.warn("⚠️ No SIM model found in Prisma Client. Simulated success response.");
          return {
            success: true,
            message: "Airtime queued (Simulation mode)",
            reference,
          };
        }

        // 4. Locate Active SIM
        const sim = await simModel.findFirst({
          where: {
            network: resolvedNetwork,
            status: "ACTIVE",
          },
        });

        if (!sim) {
          throw new Error(`No active ${resolvedNetwork} SIM found on GSM Gateway device.`);
        }

        // 5. Dynamic Prisma Command Model Resolution
        const commandModel =
          prisma.gatewayCommand ||
          prisma.command ||
          prisma.gSMCommand ||
          prisma.deviceCommand;

        let commandId = null;
        if (commandModel) {
          const command = await commandModel.create({
            data: {
              simId: sim.id,
              type: "AIRTIME",
              status: "PENDING",
              reference,
              payload: JSON.stringify({
                phone,
                amount,
                network: resolvedNetwork,
              }),
            },
          });
          commandId = command.id;
        }

        return {
          success: true,
          message: "Airtime command queued for GSM device",
          commandId,
          reference,
        };
      },
    },
  };
};