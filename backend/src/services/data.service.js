const prisma = require("../config/prisma");
const transactionService = require("./transaction.service");
const walletService = require("./wallet.service");
const providerService = require("./provider.service");
const apiUsageService = require("./apiUsage.service");
const calculateProfit = require("../helpers/calculateProfit");
const clubkonnect = require("./clubkonnect.service");
const { emitEvent, emitGatewayCommand } = require("../config/socket");

// Helper na tsaftace lambar waya zuwa 080...
const cleanLocalPhone = (phone = "") => {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 10 && !digits.startsWith("0")) {
    return `0${digits}`;
  }
  return digits;
};

/* ======================================================
   1. PURCHASE DATA BUNDLE (HYBRID: GSM SMS -> CLUBKONNECT)
====================================================== */
exports.purchaseData = async ({
  user,
  apiKey,
  network,
  planCode,
  phone,
  phoneNumber,
  amount,
  reference,
}) => {
  const targetPhone = cleanLocalPhone(phone || phoneNumber || "");
  const resolvedNetwork = String(network || "MTN").toUpperCase();
  const userTier = String(user?.tier || "REGULAR").toUpperCase();

  // 1. NEMI FARASHI (Daga ServicePricing da ServicePlan)
  const [pricingPlan, servicePlan] = await Promise.all([
    prisma.servicePricing?.findFirst({
      where: {
        category: "DATA",
        enabled: true,
        tier: userTier,
        OR: [
          { serviceCode: String(planCode).trim() },
          { serviceCode: { contains: String(planCode).trim() } },
        ],
      },
    }).catch(() => null),
    prisma.servicePlan?.findFirst({
      where: {
        planCode: String(planCode).trim(),
        network: resolvedNetwork,
        isActive: true,
      },
    }).catch(() => null),
  ]);

  const finalAmount = Number(
    amount ||
    pricingPlan?.sellingPrice ||
    servicePlan?.apiPrice ||
    servicePlan?.userPrice ||
    servicePlan?.basePrice ||
    0
  );

  if (!finalAmount || finalAmount <= 0) {
    const err = new Error("Invalid plan amount or plan code not found.");
    err.statusCode = 400;
    err.code = "INVALID_PLAN_AMOUNT";
    throw err;
  }

  // 2. TABBATAR DA WALLET BALANCE
  const wallet = await walletService.getOrCreateWallet(user.id);
  if (Number(wallet.balance) < finalAmount) {
    const err = new Error("Insufficient wallet balance.");
    err.statusCode = 402;
    err.code = "INSUFFICIENT_WALLET_BALANCE";
    throw err;
  }

  const txReference = reference || `AYAX_DATA_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  // 3. CREATE TRANSACTION RECORD
  const transaction = await transactionService.createTransaction({
    userId: user.id,
    type: "DEBIT",
    service: "DATA",
    amount: finalAmount,
    reference: txReference,
    status: "PROCESSING",
    description: `${resolvedNetwork} Data Purchase (${planCode}) to ${targetPhone}`,
    metadata: {
      network: resolvedNetwork,
      phone: targetPhone,
      planCode,
      apiKeyId: apiKey?.id,
    },
  });

  // 4. DEBIT WALLET (HOLD FUNDS)
  await walletService.debitWallet({
    userId: user.id,
    amount: finalAmount,
    reference: transaction.reference,
    description: `${resolvedNetwork} Data Purchase`,
    module: "DATA",
  });

  // Gano Adadin Data na SMS (MB da GB)
  let raw = String(planCode || "1000").toUpperCase();
  let numericMB = "1000";
  let airtelPlanText = "1GB";

  if (raw.includes("500")) {
    numericMB = "500";
    airtelPlanText = "500MB";
  } else if (raw.includes("2GB") || raw.includes("2000")) {
    numericMB = "2000";
    airtelPlanText = "2GB";
  } else if (raw.includes("3GB") || raw.includes("3000")) {
    numericMB = "3000";
    airtelPlanText = "3GB";
  } else if (raw.includes("5GB") || raw.includes("5000")) {
    numericMB = "5000";
    airtelPlanText = "5GB";
  } else if (raw.includes("10GB") || raw.includes("10000")) {
    numericMB = "10000";
    airtelPlanText = "10GB";
  } else {
    numericMB = raw.replace(/[^0-9]/g, "") || "1000";
    airtelPlanText = `${numericMB}MB`;
  }

  try {
    // 5. TAFARKI NA 1: DUBA GSM MODEM / GATEWAY (SMS EXECUTION)
    const activeDevice = await prisma.gsmDevice.findFirst({
      where: { status: "ONLINE" },
      include: { sims: true },
      orderBy: { lastSeen: "desc" },
    });

    const targetSim = activeDevice?.sims?.find(
      (s) =>
        s.carrierName?.toUpperCase().includes(resolvedNetwork) ||
        s.displayName?.toUpperCase().includes(resolvedNetwork)
    );

    if (activeDevice && targetSim) {
      const slotIndex = Number(targetSim.slotIndex ?? 0);
      const pin = process.env.GSM_DATA_PIN || "1997";

      // Tsara Umarnin SMS (Babu Dialing Code)
      let smsRecipient = "312";
      let smsMessage = `SME ${targetPhone} ${numericMB} ${pin}`;

      const planIdentifier = `${pricingPlan?.serviceCode || ""} ${pricingPlan?.serviceName || ""} ${planCode}`.toUpperCase();

      if (resolvedNetwork === "MTN") {
        if (planIdentifier.includes("CG") || planIdentifier.includes("CORP")) {
          smsRecipient = "312";
          smsMessage = `Transfer ${targetPhone} ${numericMB} ${pin}`;
        } else {
          // Default MTN SME Data
          smsRecipient = "312";
          smsMessage = `SME ${targetPhone} ${numericMB} ${pin}`;
        }
      } else if (resolvedNetwork === "AIRTEL") {
        smsRecipient = "141";
        smsMessage = `SHARE ${targetPhone} ${airtelPlanText} ${pin}`;
      } else if (resolvedNetwork === "GLO") {
        smsRecipient = "127";
        smsMessage = `Share ${targetPhone}`;
      } else if (resolvedNetwork === "9MOBILE") {
        smsRecipient = "229";
        smsMessage = `SMART ${numericMB} ${targetPhone}`;
      }

      console.log(
        `[DISPATCHING TO GATEWAY (SMS)]: Ref: ${transaction.reference} -> Target Device: ${activeDevice.id} (Slot: ${slotIndex}) -> SMS: ${smsRecipient} "${smsMessage}"`
      );

      const commandPayload = {
        reference: transaction.reference,
        deviceId: activeDevice.id,
        type: "SMS",
        action: "SEND_SMS",
        service: "DATA",
        recipient: smsRecipient,
        sendTo: smsRecipient,
        destination: smsRecipient,
        phoneNumber: smsRecipient,
        phone: smsRecipient,
        message: smsMessage,
        smsBody: smsMessage,
        smsText: smsMessage,
        targetPhone,
        slotIndex,
        simSlot: slotIndex,
        amount: finalAmount,
        network: resolvedNetwork,
      };

      await prisma.gsmCommand.create({
        data: {
          reference: transaction.reference,
          deviceId: activeDevice.id,
          type: "SEND_SMS",
          status: "PENDING",
          payload: commandPayload,
        },
      }).catch(() => null);

      try {
        const socketPayload = {
          commandId: transaction.reference,
          reference: transaction.reference,
          type: "SMS",
          action: "SEND_SMS",
          recipient: smsRecipient,
          sendTo: smsRecipient,
          message: smsMessage,
          smsBody: smsMessage,
          slotIndex,
          simSlot: slotIndex,
          payload: commandPayload,
        };

        emitEvent("gateway-command", socketPayload, activeDevice.id);
        emitEvent("command", socketPayload, activeDevice.id);
        emitEvent(`gateway-command-${activeDevice.id}`, socketPayload);

        if (typeof emitGatewayCommand === "function") {
          emitGatewayCommand(activeDevice.id, socketPayload);
        }
      } catch (socketErr) {
        console.warn("Gateway socket warning:", socketErr.message);
      }

      await apiUsageService.createUsageLog({
        userId: user.id,
        endpoint: "/api/v1/data/buy",
        method: "POST",
        amount: finalAmount,
        status: "PROCESSING",
      });

      const costPrice = pricingPlan?.costPrice || servicePlan?.costPrice || finalAmount * 0.97;
      const profit = calculateProfit({ costPrice, sellingPrice: finalAmount });

      return {
        success: true,
        reference: transaction.reference,
        route: "GSM_GATEWAY",
        network: resolvedNetwork,
        phone: targetPhone,
        planCode: numericMB,
        amount: finalAmount,
        status: "PROCESSING",
        profit,
      };
    }

    // 6. TAFARKI NA 2: AUTOMATIC FALLBACK ZUWA CLUBKONNECT
    console.log(`[DATA: CLUBKONNECT] Modem offline or SIM not found. Forwarding ${transaction.reference} to Clubkonnect API...`);

    const ckResult = await clubkonnect.vendData({
      network: resolvedNetwork,
      phone: targetPhone,
      planCode: planCode || numericMB,
      reference: transaction.reference,
    });

    if (ckResult.success) {
      await transactionService.updateTransactionStatus({
        reference: transaction.reference,
        status: "SUCCESSFUL",
        description: `${resolvedNetwork} Data (${planCode}) to ${targetPhone} via Clubkonnect`,
      });

      await apiUsageService.createUsageLog({
        userId: user.id,
        endpoint: "/api/v1/data/buy",
        method: "POST",
        amount: finalAmount,
        status: "SUCCESSFUL",
      });

      const costPrice = pricingPlan?.costPrice || servicePlan?.costPrice || finalAmount * 0.97;
      const profit = calculateProfit({ costPrice, sellingPrice: finalAmount });

      return {
        success: true,
        reference: transaction.reference,
        route: "CLUBKONNECT",
        network: resolvedNetwork,
        phone: targetPhone,
        planCode: numericMB,
        amount: finalAmount,
        status: "SUCCESSFUL",
        profit,
        providerResult: ckResult.rawResponse,
      };
    } else {
      throw new Error(JSON.stringify(ckResult.rawResponse || "Clubkonnect vending failed."));
    }
  } catch (err) {
    // 7. AUTO-REFUND NAN TAKE IDAN DUKKAN TAFARKI SUN GAZA
    console.error("Data purchase failure, processing refund:", err.message);

    await walletService.creditWallet({
      userId: user.id,
      amount: finalAmount,
      reference: `REFUND_${transaction.reference}`,
      description: `Refund for failed data purchase: ${transaction.reference}`,
      module: "REFUND",
    }).catch((e) => console.error("Refund failed:", e));

    await transactionService.updateTransactionStatus({
      reference: transaction.reference,
      status: "FAILED",
      description: err.message || "Provider vending error",
    });

    await apiUsageService.createUsageLog({
      userId: user.id,
      endpoint: "/api/v1/data/buy",
      method: "POST",
      amount: finalAmount,
      status: "FAILED",
    });

    const error = new Error(err.message || "Data provider failure.");
    error.statusCode = err.statusCode || 502;
    error.code = err.code || "PROVIDER_DELIVERY_FAILED";
    throw error;
  }
};

/* ======================================================
   2. GET DATA TRANSACTIONS
====================================================== */
exports.getDataTransactions = async (userId) => {
  return prisma.transaction.findMany({
    where: {
      userId,
      service: "DATA",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
};

/* ======================================================
   3. GET AVAILABLE PLANS (CATALOG)
====================================================== */
exports.getDataPlans = async (network) => {
  const whereClause = {
    type: "DATA",
    isActive: true,
  };

  if (network) {
    whereClause.network = String(network).toUpperCase();
  }

  if (prisma.servicePlan) {
    return prisma.servicePlan.findMany({
      where: whereClause,
      select: {
        id: true,
        planCode: true,
        name: true,
        network: true,
        volume: true,
        validity: true,
        apiPrice: true,
        basePrice: true,
      },
      orderBy: {
        apiPrice: "asc",
      },
    });
  }

  return [];
};