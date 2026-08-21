const prisma = require("../config/prisma");
const decryptApiKey = require("../helpers/decryptApiKey");
const { emitEvent } = require("../config/socket");

let gsmGatewayService;
try {
  gsmGatewayService = require("./gsmGateway.service");
} catch (e) {
  try {
    gsmGatewayService = require("./gateway.service");
  } catch (err) {
    // Fallback to internal prisma
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

        // 1. Gano layin SIM mai aiki
        const sim = await prisma.gsmSim.findFirst({
          where: {
            OR: [
              { carrierName: { contains: resolvedNetwork, mode: "insensitive" } },
              { displayName: { contains: resolvedNetwork, mode: "insensitive" } },
            ],
            status: "ACTIVE",
          },
          include: {
            device: true,
          },
        });

        // 2. Nemo Network Profile domin samun USSD Template
        const profile = await prisma.networkProfile.findFirst({
          where: { network: resolvedNetwork },
        });

        // Default USSD template idan ba a saita a database ba (misali MTN Share: *321*1*PHONE*AMOUNT*PIN#)
        let ussdTemplate = profile?.airtimeTemplate || "*321*1*{phone}*{amount}*0000#";
        
        const ussdCode = ussdTemplate
          .replace(/{phone}/gi, phone)
          .replace(/{phoneNumber}/gi, phone)
          .replace(/{amount}/gi, String(amount))
          .replace(/{pin}/gi, "0000"); // Sauya PIN din idan layin yana da PIN na daban

        // 3. Kirkiri GSM Command tare da USSD Code
        const commandReference = reference || `AIR-${Date.now()}`;
        const commandPayload = {
          phone,
          amount: Number(amount),
          network: resolvedNetwork,
          slotIndex: sim?.slotIndex ?? 0,
          carrier: sim?.carrierName || resolvedNetwork,
          ussdCode: ussdCode,
          ussd: ussdCode,
          code: ussdCode,
        };

        const command = await prisma.gsmCommand.create({
          data: {
            reference: commandReference,
            deviceId: sim?.deviceId || null,
            type: "BUY_AIRTIME",
            status: "PENDING",
            payload: commandPayload,
          },
        });

        // 4. Tura Socket Event Nan Take zuwa ga Wayar
        try {
          emitEvent(
            "gateway-command",
            {
              commandId: command.id,
              reference: command.reference,
              type: "BUY_AIRTIME",
              payload: commandPayload,
              ussdCode: ussdCode,
            },
            sim?.deviceId || undefined
          );
          console.log(`⚡ USSD Command (${ussdCode}) dispatched: ${command.reference}`);
        } catch (socketErr) {
          console.warn("Socket emission warning:", socketErr.message);
        }

        // 5. Ajiye Transaction Log
        if (sim) {
          await prisma.gsmTransaction.create({
            data: {
              simId: sim.id,
              phoneNumber: phone,
              network: resolvedNetwork,
              amount: Number(amount),
              reference: commandReference,
              status: "PENDING",
            },
          }).catch(() => {});
        }

        return {
          success: true,
          message: "Airtime command queued and dispatched to GSM Gateway",
          commandId: command.id,
          reference: command.reference,
        };
      },
    },
  };
};