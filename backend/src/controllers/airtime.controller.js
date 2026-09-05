const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");
const clubkonnect = require("../services/clubkonnect.service");

// Tsoffin discounts a matsayin madogara (Fallback) idan ba a saita a Database ba
const DEFAULT_DISCOUNTS = {
  MTN: 0.02,     // 2% discount
  AIRTEL: 0.02,  // 2% discount
  GLO: 0.03,     // 3% discount
  "9MOBILE": 0.03 // 3% discount
};

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
   1. PURCHASE AIRTIME VIA MARKETPLACE API (MTN MOMO READY)
====================================================== */
exports.purchaseAirtime = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const { network, phone, phoneNumber, amount, reference } = req.body;

    const targetPhone = cleanLocalPhone(phoneNumber || phone || "");
    const numericAmount = Math.round(Number(amount));
    const normalizedNetwork = String(network || "MTN").toUpperCase().trim();

    if (!normalizedNetwork || !targetPhone || !numericAmount || numericAmount < 50) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Valid network, recipient phone number, and minimum amount of NGN 50 are required.",
      });
    }

    // 1. Hana Maimaita Transaction (Idempotency Check)
    if (reference) {
      const existingTx = await prisma.transaction.findUnique({
        where: { reference },
      });

      if (existingTx) {
        return res.status(409).json({
          status: "error",
          code: "DUPLICATE_REFERENCE",
          message: "A transaction with this reference has already been processed.",
          transaction: existingTx,
        });
      }
    }

    // 2. Gano Matsayin Developer (Tier)
    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    // 3. Nemi Ainihin Farashi daga ServicePricing a Database
    const pricingPlan = await prisma.servicePricing.findFirst({
      where: {
        category: "AIRTIME",
        enabled: true,
        tier: userTier,
        OR: [
          { serviceCode: `${normalizedNetwork}_AIRTIME` },
          { serviceCode: normalizedNetwork },
          { serviceName: { contains: normalizedNetwork, mode: "insensitive" } },
        ],
      },
    });

    let discountAmount = 0;
    let amountToCharge = numericAmount;

    if (pricingPlan && pricingPlan.sellingPrice > 0) {
      const rate = pricingPlan.sellingPrice <= 1 
        ? pricingPlan.sellingPrice 
        : (pricingPlan.sellingPrice / 100);
      
      amountToCharge = Number((numericAmount * rate).toFixed(2));
      discountAmount = Number((numericAmount - amountToCharge).toFixed(2));
    } else {
      const fallbackRate = DEFAULT_DISCOUNTS[normalizedNetwork] || 0.02;
      discountAmount = Number((numericAmount * fallbackRate).toFixed(2));
      amountToCharge = Number((numericAmount - discountAmount).toFixed(2));
    }

    // 4. Duba Kuɗin Wallet na Mai Saye (Ba tare da cirewa ba tukuna)
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < amountToCharge) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient wallet balance to complete this purchase.",
        currentBalance: wallet ? Number(wallet.balance) : 0,
        requiredAmount: amountToCharge,
      });
    }

    // 5. PRE-FLIGHT CHECK: DUBA LAFIYAR GSM MODEM KAFIN CIRE KUDI
    const activeDevice = await prisma.gsmDevice.findFirst({
      where: { 
        status: "ONLINE",
        lastSeen: { gte: new Date(Date.now() - 2 * 60 * 1000) }
      },
      include: { sims: true },
      orderBy: { lastSeen: "desc" },
    });

    const targetSim = activeDevice?.sims?.find(
      (s) =>
        s.status === "ACTIVE" &&
        (s.carrierName?.toUpperCase().includes(normalizedNetwork) ||
         s.displayName?.toUpperCase().includes(normalizedNetwork))
    ) || activeDevice?.sims?.[0];

    const isGatewayReady = Boolean(activeDevice && targetSim);
    const isFallbackConfigured = Boolean(process.env.CLUBKONNECT_API_KEY || process.env.CLUBKONNECT_USER_ID);

    if (!isGatewayReady && !isFallbackConfigured) {
      return res.status(503).json({
        status: "error",
        code: "ROUTE_UNAVAILABLE",
        message: `${normalizedNetwork} airtime route is currently offline. No funds were debited.`,
      });
    }

    const txReference = reference || `AYAX_AIR_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // 6. CIRE KUDI A WALLET BAYAN TABBATAR DA KOFA
    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: {
          balance: { decrement: amountToCharge },
        },
      });

      const newTx = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEBIT",
          service: `${normalizedNetwork} AIRTIME`,
          amount: amountToCharge,
          status: "PENDING",
          reference: txReference,
          description: `Airtime purchase of NGN ${numericAmount} to ${targetPhone} (Charged: NGN ${amountToCharge})`,
        },
      });

      return { updatedWallet: newWallet, transaction: newTx };
    });

    // 7. ROUTE 1: GSM GATEWAY (MTN MOMO ONLY FOR MTN)
    if (isGatewayReady) {
      const slotIndex = Number(targetSim.slotIndex ?? 0);
      const pin = process.env.GSM_AIRTIME_PIN || "1997";
      const momoPin = process.env.MOMO_PIN || "8724";

      let ussdCode = "*671#";
      let steps = [];
      let pauseDialString = "";
      let directCode = "";

      if (normalizedNetwork === "MTN") {
        // Matakan MoMo: Menu 2 (Airtime/Data) -> 1 (Airtime) -> 3 (Others) -> Phone -> Amount -> PIN
        steps = ["2", "1", "3", targetPhone, String(numericAmount), momoPin];
        ussdCode = "*671#";
        pauseDialString = `*671#,2,1,3,${targetPhone},${numericAmount},${momoPin}#`;
        directCode = `*671*2*1*3*${targetPhone}*${numericAmount}*${momoPin}#`;
      } else if (normalizedNetwork === "AIRTEL") {
        ussdCode = `*321*${targetPhone}*${numericAmount}*${pin}#`;
        steps = [targetPhone, String(numericAmount), pin];
        pauseDialString = ussdCode;
        directCode = ussdCode;
      } else if (normalizedNetwork === "GLO") {
        ussdCode = `*131*${targetPhone}*${numericAmount}*${pin}#`;
        steps = [targetPhone, String(numericAmount), pin];
        pauseDialString = ussdCode;
        directCode = ussdCode;
      } else if (normalizedNetwork === "9MOBILE") {
        ussdCode = `*223*${pin}*${numericAmount}*${targetPhone}#`;
        steps = [pin, String(numericAmount), targetPhone];
        pauseDialString = ussdCode;
        directCode = ussdCode;
      }

      // Cika dukkan filaye don Accessibility Service ya gane kuma ya cika popup
      const commandPayload = {
        reference: txReference,
        commandId: txReference,
        id: txReference,
        deviceId: activeDevice.id,
        type: "USSD",
        action: "USSD",
        service: "AIRTIME",

        // Lambobin USSD a sassa daban-daban
        code: ussdCode,
        ussd: ussdCode,
        ussdCode: ussdCode,
        ussd_code: ussdCode,
        text: ussdCode,
        rootCode: ussdCode,

        // Cikakken layin da wayar za ta danna ta atomatik tare da tazarar dakatawa (Pause)
        dialString: pauseDialString,
        fullCode: directCode,

        // Matakan shigar da amsa a dialogue/popup
        steps: steps,
        sessionSteps: steps.join(","),
        stepsString: steps.join(","),
        inputSteps: steps,
        responses: steps,

        phone: targetPhone,
        targetPhone: targetPhone,
        phoneNumber: targetPhone,
        slotIndex: slotIndex,
        simSlot: slotIndex,
        amount: numericAmount,
        network: normalizedNetwork,
        routeType: normalizedNetwork === "MTN" ? "MTN_MOMO" : "DIRECT_USSD",
      };

      await prisma.gsmCommand.create({
        data: {
          reference: txReference,
          deviceId: activeDevice.id,
          type: "USSD",
          status: "PENDING",
          payload: commandPayload,
        },
      }).catch(() => null);

      try {
        emitEvent("gateway-command", commandPayload, activeDevice.id);
        emitEvent("command", commandPayload, activeDevice.id);
        console.log(`⚡ [AIRTIME USSD DISPATCH] Ref: ${txReference} -> Root: ${ussdCode} Steps: ${JSON.stringify(steps)}`);
      } catch (socketErr) {
        console.warn("Gateway socket broadcast warning:", socketErr.message);
      }

      return res.status(200).json({
        status: "success",
        code: "TRANSACTION_QUEUED",
        route: normalizedNetwork === "MTN" ? "GSM_GATEWAY_MOMO" : "GSM_GATEWAY",
        message: `Airtime transfer queued on local modem for ${targetPhone}.`,
        data: {
          reference: txReference,
          network: normalizedNetwork,
          phone: targetPhone,
          faceValue: numericAmount,
          amountCharged: amountToCharge,
          discount: discountAmount,
          tier: userTier,
          walletBalance: updatedWallet.balance,
        },
      });
    }

    // 8. ROUTE 2: FALLBACK ZUWA CLUBKONNECT
    console.log(`[AIRTIME: CLUBKONNECT] Modem offline. Forwarding ${txReference} to Clubkonnect API...`);

    try {
      const ckResult = await clubkonnect.vendAirtime({
        network: normalizedNetwork,
        phone: targetPhone,
        amount: numericAmount,
        reference: txReference,
      });

      if (ckResult.success) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "SUCCESSFUL" },
        });

        return res.status(200).json({
          status: "success",
          code: "TRANSACTION_SUCCESSFUL",
          route: "CLUBKONNECT",
          message: `NGN ${numericAmount} airtime successfully recharged to ${targetPhone}.`,
          data: {
            reference: txReference,
            network: normalizedNetwork,
            phone: targetPhone,
            faceValue: numericAmount,
            amountCharged: amountToCharge,
            discount: discountAmount,
            tier: userTier,
            walletBalance: updatedWallet.balance,
          },
        });
      } else {
        throw new Error(JSON.stringify(ckResult.rawResponse || "Clubkonnect failed to process airtime"));
      }
    } catch (upstreamErr) {
      console.error("Clubkonnect Airtime Error, initiating refund:", upstreamErr.message);

      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: amountToCharge } },
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { 
            status: "FAILED",
            description: `FAILED: Airtime recharge of NGN ${numericAmount} to ${targetPhone} (Refunded NGN ${amountToCharge})` 
          },
        }),
      ]);

      return res.status(502).json({
        status: "error",
        code: "PROVIDER_FAILURE",
        message: "Airtime vending failed across all available providers. Your wallet balance has been refunded.",
      });
    }
  } catch (error) {
    console.error("Airtime purchase error:", error);
    return res.status(500).json({
      status: "error",
      code: "SERVER_ERROR",
      message: "An error occurred while processing airtime purchase.",
      error: error.message,
    });
  }
};

/* ======================================================
   2. QUERY AIRTIME STATUS
====================================================== */
exports.checkAirtimeStatus = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const { reference } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        reference,
        userId: user.id,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        status: "error",
        code: "TRANSACTION_NOT_FOUND",
        message: `No airtime transaction found with reference '${reference}'.`,
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        reference: transaction.reference,
        service: transaction.service,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("Check airtime status error:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to query airtime status.",
    });
  }
};

/* ======================================================
   3. GET AIRTIME TRANSACTION HISTORY
====================================================== */
exports.getAirtimeHistory = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;

    const history = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: "DEBIT",
        service: { contains: "AIRTIME" },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return res.status(200).json({
      status: "success",
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("Get airtime history error:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve airtime history.",
    });
  }
};