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
    // GSM service fallback
  }
}

// Taimakon tsaftace lambar waya zuwa 080...
const formatLocalPhone = (phone = "") => {
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return `0${cleaned.slice(3)}`;
  }
  if (cleaned.length === 10 && !cleaned.startsWith("0")) {
    return `0${cleaned}`;
  }
  return cleaned;
};

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
      // 1. AIRTIME HANDLER (MTN MOMO USSD DIRECT)
      // ==========================================
      buyAirtime: async ({ network, phone, amount, reference }) => {
        const networkMap = {
          "1": "MTN", "01": "MTN", "MTN": "MTN",
          "2": "GLO", "02": "GLO", "GLO": "GLO",
          "3": "AIRTEL", "03": "AIRTEL", "AIRTEL": "AIRTEL",
          "4": "9MOBILE", "04": "9MOBILE", "9MOBILE": "9MOBILE",
          "ETISALAT": "9MOBILE",
        };

        const resolvedNetwork = networkMap[String(network).toUpperCase()] || String(network || "MTN").toUpperCase();
        const targetPhone = formatLocalPhone(phone);
        const airtimeAmount = Math.round(Number(amount));
        const defaultPin = process.env.GSM_AIRTIME_PIN || "1997";
        const momoPin = process.env.MOMO_PIN || "8724";

        if (gsmGatewayService && typeof gsmGatewayService.processAirtime === "function") {
          return await gsmGatewayService.processAirtime({
            network: resolvedNetwork,
            phone: targetPhone,
            amount: airtimeAmount,
            reference,
          });
        }

        const activeDevice = await prisma.gsmDevice.findFirst({
          where: { 
            status: "ONLINE",
            lastSeen: { gte: new Date(Date.now() - 2 * 60 * 1000) }
          },
          include: { sims: true },
          orderBy: { lastSeen: "desc" },
        });

        if (!activeDevice) {
          throw new Error("No GSM Gateway device is currently ONLINE.");
        }

        const sim = activeDevice.sims.find(
          (s) =>
            s.carrierName?.toUpperCase().includes(resolvedNetwork) ||
            s.displayName?.toUpperCase().includes(resolvedNetwork)
        ) || activeDevice.sims[0];

        const deviceId = activeDevice.id;
        const slotIndex = Number(sim?.slotIndex ?? 0);
        const commandReference = reference || `AIR-${Date.now()}`;

        let ussdCode = "*671#";
        let steps = [];

        if (resolvedNetwork === "MTN") {
          // MTN MoMo flow: *671# -> 2 -> 1 -> 3 -> Phone -> Amount -> PIN (8724)
          ussdCode = "*671#";
          steps = ["2", "1", "3", targetPhone, String(airtimeAmount), momoPin];
        } else if (resolvedNetwork === "AIRTEL") {
          ussdCode = `*321*${targetPhone}*${airtimeAmount}*${defaultPin}#`;
          steps = [targetPhone, String(airtimeAmount), defaultPin];
        } else if (resolvedNetwork === "GLO") {
          ussdCode = `*131*${targetPhone}*${airtimeAmount}*${defaultPin}#`;
          steps = [targetPhone, String(airtimeAmount), defaultPin];
        } else if (resolvedNetwork === "9MOBILE") {
          ussdCode = `*223*${defaultPin}*${airtimeAmount}*${targetPhone}#`;
          steps = [defaultPin, String(airtimeAmount), targetPhone];
        }

        // Cika dukkan filaye don kawar da "USSD code is missing"
        const commandPayload = {
          reference: commandReference,
          commandId: commandReference,
          id: commandReference,
          deviceId,
          type: "USSD",
          action: "USSD",
          service: "AIRTIME",
          code: ussdCode,
          ussd: ussdCode,
          ussdCode: ussdCode,
          ussd_code: ussdCode,
          text: ussdCode,
          rootCode: ussdCode,
          steps,
          phone: targetPhone,
          targetPhone,
          phoneNumber: targetPhone,
          amount: airtimeAmount,
          network: resolvedNetwork,
          slotIndex,
          simSlot: slotIndex,
          simId: sim?.id || null,
          carrier: sim?.carrierName || resolvedNetwork,
          routeType: resolvedNetwork === "MTN" ? "MTN_MOMO" : "DIRECT_USSD",
        };

        const command = await prisma.gsmCommand.create({
          data: {
            reference: commandReference,
            deviceId,
            type: "USSD",
            status: "PENDING",
            payload: commandPayload,
          },
        });

        try {
          const eventPayload = {
            ...commandPayload,
            commandId: command.id,
            id: command.id,
          };

          emitEvent("gateway-command", eventPayload, deviceId);
          console.log(`⚡ [AIRTIME USSD SENT] Ref: ${command.reference} -> Code: ${ussdCode} Steps: ${JSON.stringify(steps)}`);
        } catch (socketErr) {
          console.warn("Socket emission warning:", socketErr.message);
        }

        if (sim) {
          await prisma.gsmTransaction.create({
            data: {
              simId: sim.id,
              phoneNumber: targetPhone,
              network: resolvedNetwork,
              amount: airtimeAmount,
              reference: commandReference,
              status: "PENDING",
            },
          }).catch(() => {});
        }

        return {
          success: true,
          status: "PROCESSING",
          route: "GSM_GATEWAY",
          message: "Airtime USSD command queued and dispatched to GSM Gateway",
          commandId: command.id,
          reference: command.reference,
        };
      },

      // ==========================================
      // 2. DATA HANDLER (USSD FIRST + SME DISPATCH)
      // ==========================================
      buyData: async ({ network, phone, planSize, planCode, amount, reference }) => {
        const resolvedNetwork = String(network || "MTN").toUpperCase();
        const targetPhone = formatLocalPhone(phone);
        const pin = process.env.GSM_DATA_PIN || "1997";
        const commandReference = reference || `DATA-${Date.now()}`;

        let numericMB = "1000";
        let mtnSmeCode = "SMEB";
        const rawPlan = String(planSize || planCode || "1000").toUpperCase().trim();

        if (rawPlan.includes("500")) {
          numericMB = "500";
          mtnSmeCode = "SMEA";
        } else if (rawPlan.includes("2GB") || rawPlan.includes("2000") || rawPlan.includes("2.0GB")) {
          numericMB = "2000";
          mtnSmeCode = "SMEC";
        } else if (rawPlan.includes("3GB") || rawPlan.includes("3000")) {
          numericMB = "3000";
          mtnSmeCode = "SMED";
        } else if (rawPlan.includes("5GB") || rawPlan.includes("5000")) {
          numericMB = "5000";
          mtnSmeCode = "SMEE";
        } else if (rawPlan.includes("10GB") || rawPlan.includes("10000")) {
          numericMB = "10000";
          mtnSmeCode = "SMEF";
        } else {
          numericMB = rawPlan.replace(/[^0-9]/g, "") || "1000";
          mtnSmeCode = "SMEB";
        }

        const activeDevice = await prisma.gsmDevice.findFirst({
          where: { 
            status: "ONLINE",
            lastSeen: { gte: new Date(Date.now() - 2 * 60 * 1000) }
          },
          include: { sims: true },
          orderBy: { lastSeen: "desc" },
        });

        if (!activeDevice) {
          throw new Error("No GSM Gateway device is currently ONLINE.");
        }

        let sim = activeDevice.sims.find(
          (s) =>
            s.carrierName?.toUpperCase().includes(resolvedNetwork) ||
            s.displayName?.toUpperCase().includes(resolvedNetwork)
        ) || activeDevice.sims[0];

        const slotIndex = Number(sim?.slotIndex ?? 0);

        let ussdCode = `*312*${targetPhone}*${numericMB}*${pin}#`;
        let steps = [targetPhone, numericMB, pin];

        if (resolvedNetwork === "MTN") {
          ussdCode = `*461*1*${targetPhone}*${numericMB}*${pin}#`;
          steps = ["1", targetPhone, numericMB, pin];
        } else if (resolvedNetwork === "AIRTEL") {
          ussdCode = `*312*${targetPhone}*${numericMB}*${pin}#`;
          steps = [targetPhone, numericMB, pin];
        } else if (resolvedNetwork === "GLO") {
          ussdCode = `*127*${numericMB}*${targetPhone}#`;
          steps = [numericMB, targetPhone];
        } else if (resolvedNetwork === "9MOBILE") {
          ussdCode = `*229*${numericMB}*${targetPhone}#`;
          steps = [numericMB, targetPhone];
        }

        const commandPayload = {
          reference: commandReference,
          commandId: commandReference,
          id: commandReference,
          deviceId: activeDevice.id,
          type: "USSD",
          action: "USSD",
          service: "DATA",
          code: ussdCode,
          ussd: ussdCode,
          ussdCode: ussdCode,
          ussd_code: ussdCode,
          text: ussdCode,
          rootCode: ussdCode,
          steps,
          phone: targetPhone,
          targetPhone,
          phoneNumber: targetPhone,
          slotIndex,
          simSlot: slotIndex,
          simId: sim?.id || null,
          amount: Number(amount || 0),
          network: resolvedNetwork,
        };

        const command = await prisma.gsmCommand.create({
          data: {
            reference: commandReference,
            deviceId: activeDevice.id,
            type: "USSD",
            status: "PENDING",
            payload: commandPayload,
          },
        });

        try {
          const eventPayload = {
            ...commandPayload,
            commandId: command.id,
            id: command.id,
          };

          emitEvent("gateway-command", eventPayload, activeDevice.id);
          console.log(`⚡ [DATA USSD SENT] Ref: ${command.reference} -> Code: ${ussdCode}`);
        } catch (socketErr) {
          console.warn("Socket emission warning:", socketErr.message);
        }

        if (sim) {
          await prisma.gsmTransaction.create({
            data: {
              simId: sim.id,
              phoneNumber: targetPhone,
              network: resolvedNetwork,
              amount: Number(amount || 0),
              reference: commandReference,
              status: "PENDING",
            },
          }).catch(() => {});
        }

        return {
          success: true,
          status: "PROCESSING",
          route: "GSM_GATEWAY",
          message: "Data purchase command dispatched to GSM Gateway via USSD",
          commandId: command.id,
          reference: command.reference,
        };
      },
    },
  };
};