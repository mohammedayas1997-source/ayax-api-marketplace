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
      // 1. AIRTIME HANDLER (SMS COMMAND DISPATCH)
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
        const targetPhone = formatLocalPhone(phone);
        const airtimeAmount = Math.round(Number(amount));
        const defaultPin = process.env.GSM_AIRTIME_PIN || "1997";

        console.log(`📡 Dispatching Airtime via SMS: ${resolvedNetwork} ₦${airtimeAmount} -> ${targetPhone}`);

        if (
          gsmGatewayService &&
          typeof gsmGatewayService.processAirtime === "function"
        ) {
          return await gsmGatewayService.processAirtime({
            network: resolvedNetwork,
            phone: targetPhone,
            amount: airtimeAmount,
            reference,
          });
        }

        // 1. Nemo Device da SIM din da ke aiki
        const activeDevice = await prisma.gsmDevice.findFirst({
          where: { status: "ONLINE" },
          include: { sims: true },
          orderBy: { lastSeen: "desc" },
        });

        const sim = activeDevice?.sims.find(
          (s) =>
            s.carrierName?.toUpperCase().includes(resolvedNetwork) ||
            s.displayName?.toUpperCase().includes(resolvedNetwork)
        ) || await prisma.gsmSim.findFirst({
          where: {
            OR: [
              { carrierName: { contains: resolvedNetwork, mode: "insensitive" } },
              { displayName: { contains: resolvedNetwork, mode: "insensitive" } },
            ],
            status: "ACTIVE",
          },
          include: { device: true },
        });

        const deviceId = activeDevice?.id || sim?.deviceId || null;
        const slotIndex = sim?.slotIndex ?? 0;

        // 2. Saita Umarnin SMS (Shortcode da Body)
        let smsRecipient = "321";
        let smsMessage = `Transfer ${targetPhone} ${airtimeAmount} ${defaultPin}`;

        if (resolvedNetwork === "AIRTEL") {
          smsRecipient = "432";
          smsMessage = `2U ${targetPhone} ${airtimeAmount} ${defaultPin}`;
        } else if (resolvedNetwork === "GLO") {
          smsRecipient = "131";
          smsMessage = `Transfer ${targetPhone} ${airtimeAmount} ${defaultPin}`;
        } else if (resolvedNetwork === "9MOBILE") {
          smsRecipient = "223";
          smsMessage = `${defaultPin} ${airtimeAmount} ${targetPhone}`;
        }

        const commandReference = reference || `AIR-${Date.now()}`;
        const commandPayload = {
          reference: commandReference,
          deviceId,
          type: "SMS",
          action: "SEND_SMS",
          recipient: smsRecipient,
          sendTo: smsRecipient,
          destination: smsRecipient,
          phone: smsRecipient,
          message: smsMessage,
          smsBody: smsMessage,
          targetPhone,
          amount: airtimeAmount,
          network: resolvedNetwork,
          slotIndex,
          simSlot: slotIndex,
          simId: sim?.id || null,
          carrier: sim?.carrierName || resolvedNetwork,
        };

        const command = await prisma.gsmCommand.create({
          data: {
            reference: commandReference,
            deviceId,
            type: "SEND_SMS",
            status: "PENDING",
            payload: commandPayload,
          },
        });

        try {
          const eventPayload = {
            commandId: command.id,
            id: command.id,
            reference: command.reference,
            type: "SMS",
            action: "SEND_SMS",
            recipient: smsRecipient,
            sendTo: smsRecipient,
            message: smsMessage,
            slotIndex,
            simSlot: slotIndex,
            payload: commandPayload,
          };

          emitEvent("gateway-command", eventPayload, deviceId || undefined);
          emitEvent("command", eventPayload, deviceId || undefined);
          if (deviceId) {
            emitEvent(`gateway-command-${deviceId}`, eventPayload);
          }

          console.log(`⚡ [AIRTIME SMS DISPATCHED] Ref: ${command.reference} -> ${smsRecipient} (${smsMessage})`);
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
          message: "Airtime command dispatched to GSM Gateway via SMS",
          commandId: command.id,
          reference: command.reference,
        };
      },

      // ==========================================
      // 2. DATA HANDLER (SMS COMMAND DISPATCH)
      // ==========================================
      buyData: async ({ network, phone, planSize, planCode, amount, reference }) => {
        const resolvedNetwork = String(network || "MTN").toUpperCase();
        const targetPhone = formatLocalPhone(phone);
        const pin = process.env.GSM_DATA_PIN || "1997";

        // Gano Adadin Data da Lambar SMS Format
        let dataPlanCode = "1000";
        let airtelPlanCode = "1GB";
        const rawPlan = String(planSize || planCode || "").toUpperCase();

        if (rawPlan.includes("500")) {
          dataPlanCode = "500";
          airtelPlanCode = "500MB";
        } else if (rawPlan.includes("2GB") || rawPlan.includes("2000") || rawPlan.includes("2.0GB")) {
          dataPlanCode = "2000";
          airtelPlanCode = "2GB";
        } else if (rawPlan.includes("3GB") || rawPlan.includes("3000")) {
          dataPlanCode = "3000";
          airtelPlanCode = "3GB";
        } else if (rawPlan.includes("5GB") || rawPlan.includes("5000")) {
          dataPlanCode = "5000";
          airtelPlanCode = "5GB";
        } else if (rawPlan.includes("10GB") || rawPlan.includes("10000")) {
          dataPlanCode = "10000";
          airtelPlanCode = "10GB";
        } else {
          // Default 1GB
          dataPlanCode = "1000";
          airtelPlanCode = "1GB";
        }

        // 1. Nemo Device da yake ONLINE
        const activeDevice = await prisma.gsmDevice.findFirst({
          where: { status: "ONLINE" },
          include: { sims: true },
          orderBy: { lastSeen: "desc" },
        });

        if (!activeDevice) {
          throw new Error("No GSM Gateway device is currently ONLINE.");
        }

        // 2. Nemo SIM na wannan network
        let sim = activeDevice.sims.find(
          (s) =>
            s.carrierName?.toUpperCase().includes(resolvedNetwork) ||
            s.displayName?.toUpperCase().includes(resolvedNetwork)
        ) || activeDevice.sims[0];

        const slotIndex = sim?.slotIndex ?? 0;
        const commandReference = reference || `DATA-${Date.now()}`;

        // 3. Saita Umarnin SMS na Data
        let smsRecipient = "312";
        let smsMessage = `SME ${targetPhone} ${dataPlanCode} ${pin}`;

        if (resolvedNetwork === "AIRTEL") {
          smsRecipient = "141";
          smsMessage = `SHARE ${targetPhone} ${airtelPlanCode} ${pin}`;
        } else if (resolvedNetwork === "GLO") {
          smsRecipient = "127";
          smsMessage = `Share ${targetPhone}`;
        } else if (resolvedNetwork === "9MOBILE") {
          smsRecipient = "229";
          smsMessage = `SMART ${dataPlanCode} ${targetPhone}`;
        }

        const commandPayload = {
          reference: commandReference,
          deviceId: activeDevice.id,
          type: "SMS",
          action: "SEND_SMS",
          recipient: smsRecipient,
          sendTo: smsRecipient,
          destination: smsRecipient,
          phone: smsRecipient,
          message: smsMessage,
          smsBody: smsMessage,
          targetPhone,
          slotIndex,
          simSlot: slotIndex,
          simId: sim?.id || null,
          amount: Number(amount || 0),
          network: resolvedNetwork,
        };

        // 4. Ajiye a gsmCommand
        const command = await prisma.gsmCommand.create({
          data: {
            reference: commandReference,
            deviceId: activeDevice.id,
            type: "SEND_SMS",
            status: "PENDING",
            payload: commandPayload,
          },
        });

        // 5. Watsa ta Socket zuwa Android GSM App
        try {
          const eventPayload = {
            commandId: command.id,
            id: command.id,
            reference: command.reference,
            type: "SMS",
            action: "SEND_SMS",
            recipient: smsRecipient,
            sendTo: smsRecipient,
            destination: smsRecipient,
            message: smsMessage,
            smsBody: smsMessage,
            phoneNumber: targetPhone,
            slotIndex,
            simSlot: slotIndex,
            payload: commandPayload,
          };

          emitEvent("gateway-command", eventPayload, activeDevice.id);
          emitEvent("command", eventPayload, activeDevice.id);
          emitEvent(`gateway-command-${activeDevice.id}`, eventPayload);

          console.log(`⚡ [DATA SMS SENT] Ref: ${command.reference} -> ${smsRecipient} (${smsMessage}) on Slot ${slotIndex}`);
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
          message: "Data purchase command queued and dispatched to GSM Gateway via SMS",
          commandId: command.id,
          reference: command.reference,
        };
      },
    },
  };
};