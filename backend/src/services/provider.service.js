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

      // ==========================================
      // 1. AIRTIME HANDLER
      // ==========================================
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

        const defaultPin = "1997";
        let ussdCode = `*321*1*${phone}*${amount}*${defaultPin}#`;
        let steps = ["1", phone, String(amount), defaultPin];

        if (resolvedNetwork === "AIRTEL") {
          ussdCode = `*432*1*${phone}*${amount}*${defaultPin}#`;
          steps = ["1", phone, String(amount), defaultPin];
        } else if (resolvedNetwork === "GLO") {
          ussdCode = `*131*${phone}*${amount}*${defaultPin}#`;
          steps = [phone, String(amount), defaultPin];
        } else if (resolvedNetwork === "9MOBILE") {
          ussdCode = `*223*${defaultPin}*${amount}*${phone}#`;
          steps = [defaultPin, String(amount), phone];
        }

        const profile = await prisma.networkProfile.findFirst({
          where: { network: resolvedNetwork },
        });

        if (profile?.airtimeTemplate) {
          ussdCode = profile.airtimeTemplate
            .replace(/{phone}/gi, phone)
            .replace(/{phoneNumber}/gi, phone)
            .replace(/{amount}/gi, String(amount))
            .replace(/{pin}/gi, defaultPin);
        }

        const commandReference = reference || `AIR-${Date.now()}`;
        const commandPayload = {
          phone,
          amount: Number(amount),
          network: resolvedNetwork,
          slotIndex: sim?.slotIndex ?? 0,
          carrier: sim?.carrierName || resolvedNetwork,
          ussdCode,
          ussd: ussdCode,
          code: ussdCode,
          steps,
          autoReply: "1",
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

        try {
          emitEvent(
            "gateway-command",
            {
              commandId: command.id,
              reference: command.reference,
              type: "BUY_AIRTIME",
              payload: commandPayload,
              ussdCode,
              steps,
            },
            sim?.deviceId || undefined
          );
          console.log(`⚡ Direct USSD (${ussdCode}) emitted for ref: ${command.reference}`);
        } catch (socketErr) {
          console.warn("Socket emission warning:", socketErr.message);
        }

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

      // ==========================================
      // 2. DATA (SME & GIFTING) HANDLER
      // ==========================================
      buyData: async ({ network, phone, planSize, planCode, amount, reference }) => {
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
        };

        const resolvedNetwork =
          networkMap[String(network).toUpperCase()] || String(network).toUpperCase();

        console.log(
          `📡 Dispatching Data (${planSize || planCode}) to GSM Gateway: ${resolvedNetwork} -> ${phone}`
        );

        if (
          gsmGatewayService &&
          typeof gsmGatewayService.processData === "function"
        ) {
          return await gsmGatewayService.processData({
            network: resolvedNetwork,
            phone,
            planSize,
            planCode,
            amount,
            reference,
          });
        }

        // 1. Locate Active SIM
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

        if (!sim) {
          throw new Error(`No active ${resolvedNetwork} SIM found on GSM Gateway.`);
        }

        const defaultPin = "1997";
        const commandReference = reference || `DATA-${Date.now()}`;

        // 2. Format SME Data Volume (MB Conversion)
        let sizeInMb = "1000";
        const rawSize = String(planSize || planCode || "").toUpperCase();

        if (rawSize.includes("500MB") || rawSize.includes("500")) {
          sizeInMb = "500";
        } else if (rawSize.includes("1GB") || rawSize.includes("1000") || rawSize.includes("1.0GB")) {
          sizeInMb = "1000";
        } else if (rawSize.includes("2GB") || rawSize.includes("2000") || rawSize.includes("2.0GB")) {
          sizeInMb = "2000";
        } else if (rawSize.includes("3GB") || rawSize.includes("3000")) {
          sizeInMb = "3000";
        } else if (rawSize.includes("5GB") || rawSize.includes("5000")) {
          sizeInMb = "5000";
        } else if (rawSize.includes("10GB") || rawSize.includes("10000")) {
          sizeInMb = "10000";
        }

        // 3. SME Command Generation
        // MTN SME yana aiki ta hanyar tura SMS: SMEB <Phone> <MB> <PIN> zuwa 131
        const smsRecipient = "131";
        const smsMessage = `SMEB ${phone} ${sizeInMb} ${defaultPin}`;

        const commandPayload = {
          phone,
          recipient: smsRecipient,
          phoneNumber: smsRecipient,
          message: smsMessage,
          smsText: smsMessage,
          sizeInMb,
          planSize: rawSize,
          network: resolvedNetwork,
          slotIndex: sim.slotIndex,
          carrier: sim.carrierName || resolvedNetwork,
          type: "SME_DATA",
        };

        const command = await prisma.gsmCommand.create({
          data: {
            reference: commandReference,
            deviceId: sim.deviceId,
            type: "BUY_DATA",
            status: "PENDING",
            payload: commandPayload,
          },
        });

        // 4. Emit Real-time Socket Event to Device
        try {
          emitEvent(
            "gateway-command",
            {
              commandId: command.id,
              reference: command.reference,
              type: "BUY_DATA",
              payload: commandPayload,
              smsRecipient,
              smsMessage,
            },
            sim.deviceId
          );
          console.log(`⚡ SME Data SMS (${smsMessage}) emitted for ref: ${command.reference}`);
        } catch (socketErr) {
          console.warn("Socket emission warning:", socketErr.message);
        }

        // 5. Record GSM Transaction Log
        await prisma.gsmTransaction.create({
          data: {
            simId: sim.id,
            phoneNumber: phone,
            network: resolvedNetwork,
            amount: Number(amount || 0),
            reference: commandReference,
            status: "PENDING",
          },
        }).catch(() => {});

        return {
          success: true,
          message: "Data purchase command queued and dispatched to GSM Gateway",
          commandId: command.id,
          reference: command.reference,
        };
      },
    },
  };
};