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
      // 1. AIRTIME HANDLER (MTN MoMo PSB *671*1*1*PHONE*AMOUNT*PIN#)
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
          `📡 Dispatching MoMo Airtime: ${resolvedNetwork} ₦${amount} -> ${phone}`
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

        const momoPin = "1997";
        
        // Ainihin tsarin MoMo Airtime: *671*1*1*PHONE*AMOUNT*PIN#
        let ussdCode = `*671*1*1*${phone}*${amount}*${momoPin}#`;
        let steps = ["1", "1", phone, String(amount), momoPin];

        if (resolvedNetwork === "AIRTEL") {
          ussdCode = `*432*1*${phone}*${amount}*${momoPin}#`;
          steps = ["1", phone, String(amount), momoPin];
        } else if (resolvedNetwork === "GLO") {
          ussdCode = `*131*${phone}*${amount}*${momoPin}#`;
          steps = [phone, String(amount), momoPin];
        } else if (resolvedNetwork === "9MOBILE") {
          ussdCode = `*223*${momoPin}*${amount}*${phone}#`;
          steps = [momoPin, String(amount), phone];
        }

        const profile = await prisma.networkProfile.findFirst({
          where: { network: resolvedNetwork },
        });

        if (profile?.airtimeTemplate) {
          ussdCode = profile.airtimeTemplate
            .replace(/{phone}/gi, phone)
            .replace(/{phoneNumber}/gi, phone)
            .replace(/{amount}/gi, String(amount))
            .replace(/{pin}/gi, momoPin);
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
          console.log(`⚡ MoMo USSD (${ussdCode}) dispatched: ${command.reference}`);
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
          message: "Airtime command queued and dispatched to GSM Gateway via MoMo",
          commandId: command.id,
          reference: command.reference,
        };
      },

      // ==========================================
      // 2. DATA HANDLER (AN GYARA TSARIN DISPATCH GA GSM GATEWAY)
      // ==========================================
      buyData: async ({ network, phone, planSize, planCode, amount, reference }) => {
        const resolvedNetwork = String(network || "MTN").toUpperCase();
        const pin = "1997";

        let dataSizeCode = "1000";
        const rawPlan = String(planSize || planCode || "").toUpperCase();

        if (rawPlan.includes("500")) dataSizeCode = "500";
        if (rawPlan.includes("1GB") || rawPlan.includes("1000") || rawPlan.includes("1.0GB")) dataSizeCode = "1000";
        if (rawPlan.includes("2GB") || rawPlan.includes("2000") || rawPlan.includes("2.0GB")) dataSizeCode = "2000";
        if (rawPlan.includes("3GB") || rawPlan.includes("3000")) dataSizeCode = "3000";
        if (rawPlan.includes("5GB") || rawPlan.includes("5000")) dataSizeCode = "5000";
        if (rawPlan.includes("10GB") || rawPlan.includes("10000")) dataSizeCode = "10000";

        // 1. Nemo SIM din da ya dace da Network ko SIM mai aiki a Device din da yake ONLINE
        let sim = await prisma.gsmSim.findFirst({
          where: {
            OR: [
              { carrierName: { contains: resolvedNetwork, mode: "insensitive" } },
              { displayName: { contains: resolvedNetwork, mode: "insensitive" } },
            ],
            status: "ACTIVE",
          },
          include: { device: true },
        });

        // Idan babu takamaiman sunan carrier, dauko kowane active sim na farko
        if (!sim) {
          sim = await prisma.gsmSim.findFirst({
            where: { status: "ACTIVE" },
            include: { device: true },
          });
        }

        // Idan har yanzu babu, duba device da ke ONLINE
        let deviceId = sim?.deviceId || null;
        if (!deviceId) {
          const onlineDevice = await prisma.gsmDevice.findFirst({
            where: { status: "ONLINE" },
            orderBy: { lastSeen: "desc" },
          });
          deviceId = onlineDevice?.id || null;
        }

        const slotIndex = sim?.slotIndex ?? 0;
        const smsRecipient = "131";
        const smsMessage = `SMEB ${phone} ${dataSizeCode} ${pin}`;
        const ussdCode = `*312*${phone}*${dataSizeCode}#`;
        const commandReference = reference || `DATA-${Date.now()}`;

        const commandPayload = {
          reference: commandReference,
          deviceId: deviceId,
          type: "SEND_SMS",
          phoneNumber: smsRecipient,
          recipient: smsRecipient,
          message: smsMessage,
          smsText: smsMessage,
          body: smsMessage,
          slotIndex: slotIndex,
          simSlot: slotIndex,
          simId: sim?.id || null,
          targetPhone: phone,
          phone: phone,
          sizeInMb: dataSizeCode,
          network: resolvedNetwork,
          carrier: sim?.carrierName || resolvedNetwork,
          ussdCode: ussdCode,
          code: ussdCode,
          amount: Number(amount || 0),
        };

        // 2. Ajiye a Database a matsayin PENDING command
        const command = await prisma.gsmCommand.create({
          data: {
            reference: commandReference,
            deviceId: deviceId,
            type: "SEND_SMS",
            status: "PENDING",
            payload: commandPayload,
          },
        });

        // 3. Watsa Event ta Socket zuwa dakin Device da kuma duk sauran tashoshin Android Gateway
        try {
          const eventPayload = {
            commandId: command.id,
            id: command.id,
            reference: command.reference,
            type: "SEND_SMS",
            payload: commandPayload,
            phoneNumber: smsRecipient,
            recipient: smsRecipient,
            message: smsMessage,
            smsText: smsMessage,
            slotIndex: slotIndex,
            simSlot: slotIndex,
            targetPhone: phone,
            ussdCode: ussdCode,
            code: ussdCode,
          };

          emitEvent("gateway-command", eventPayload, deviceId || undefined);
          emitEvent("command", eventPayload, deviceId || undefined);

          if (deviceId) {
            emitEvent(`gateway-command-${deviceId}`, eventPayload);
          }

          console.log(`⚡ [DATA DISPATCHED] Ref: ${command.reference} -> Device: ${deviceId || "Broadcast"} (Slot: ${slotIndex})`);
        } catch (socketErr) {
          console.warn("Socket emission warning:", socketErr.message);
        }

        if (sim) {
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
        }

        return {
          success: true,
          message: "Data purchase command queued successfully",
          commandId: command.id,
          reference: command.reference,
        };
      },
    },
  };
};