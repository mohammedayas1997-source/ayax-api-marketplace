const axios = require("axios");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const { emitEvent, emitGatewayCommand } = require("../config/socket");

const AYAX_API_BASE_URL = process.env.AYAX_API_URL || "https://api.ayaxdata.com/api/v1";
const AYAX_API_KEY = process.env.AYAX_API_KEY;

const NETWORK_MAP = {
  "1": "MTN",
  "2": "AIRTEL",
  "3": "9MOBILE",
  "4": "GLO",
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

const ayaxClient = axios.create({
  baseURL: AYAX_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${AYAX_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 35000,
});

/* ======================================================
   1. DATA BUNDLE PURCHASE (PRIMARY GATEWAY FIRST + UPSTREAM)
====================================================== */
exports.buyData = async (req, res) => {
  try {
    const user = req.user;
    const {
      network,
      network_id,
      networkId,
      phone,
      phoneNumber,
      planCode,
      plan_id,
      planId,
      amount,
      pin,
    } = req.body;

    const targetPhone = cleanLocalPhone(phoneNumber || phone || "");
    const resolvedNetworkId = String(network_id || networkId || (network === "MTN" ? "1" : network === "AIRTEL" ? "2" : network === "9MOBILE" ? "3" : network === "GLO" ? "4" : "1")).trim();
    const resolvedNetwork = String(network || NETWORK_MAP[resolvedNetworkId] || "MTN").toUpperCase().trim();
    const resolvedPlanCode = String(plan_id || planId || planCode || "").trim();
    const cost = Number(amount);

    if (!resolvedNetwork || !targetPhone || !resolvedPlanCode) {
      return res.status(400).json({
        success: false,
        message: "network/network_id, phone number, and planCode/plan_id are required.",
      });
    }

    if (!cost || isNaN(cost) || cost <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive purchase amount is required.",
      });
    }

    const reference = "AYX_DATA_" + crypto.randomBytes(6).toString("hex").toUpperCase();

    // 1. Verify User Wallet Balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        success: false,
        message: "Insufficient wallet balance. Please fund your account.",
        requiredAmount: cost,
        currentBalance: wallet ? Number(wallet.balance) : 0,
      });
    }

    // 2. Atomic Wallet Debit & Transaction Record
    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore - cost;

    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: balanceAfter },
      });

      const t = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DATA_PURCHASE",
          amount: cost,
          status: "PROCESSING",
          reference,
          description: `${resolvedNetwork} Data (${resolvedPlanCode}) to ${targetPhone}`,
        },
      });

      await tx.walletLedger.create({
        data: {
          userId: user.id,
          reference,
          type: "DEBIT",
          amount: cost,
          balanceBefore,
          balanceAfter,
          module: "DATA",
          description: `${resolvedNetwork} Data purchase for ${targetPhone}`,
        },
      });

      return { updatedWallet: w, transaction: t };
    });

    emitEvent("wallet-updated", {
      userId: user.id,
      wallet: updatedWallet,
    });

    // 3. STEP 1: CHECK LOCAL GSM MODEM GATEWAY FIRST
    let activeDevice = null;
    let targetSim = null;

    try {
      activeDevice = await prisma.gsmDevice.findFirst({
        where: {
          status: "ONLINE",
          lastSeen: { gte: new Date(Date.now() - 3 * 60 * 1000) },
        },
        include: { sims: true },
        orderBy: { lastSeen: "desc" },
      });

      if (activeDevice && activeDevice.sims) {
        targetSim = activeDevice.sims.find(
          (s) =>
            s.status === "ACTIVE" &&
            (String(s.carrierName || "").toUpperCase().includes(resolvedNetwork) ||
             String(s.displayName || "").toUpperCase().includes(resolvedNetwork) ||
             String(s.network || "").toUpperCase().includes(resolvedNetwork))
        );
      }

      if (activeDevice && targetSim) {
        const slotIndex = Number(targetSim.slotIndex ?? 0);
        const gsmPin = process.env.GSM_DATA_PIN || "1997";

        let smsRecipient = "312";
        let smsMessage = `SMEB ${targetPhone} ${gsmPin}`;

        if (resolvedNetwork === "AIRTEL") {
          smsRecipient = "141";
          smsMessage = `SHARE ${targetPhone} 1GB ${gsmPin}`;
        } else if (resolvedNetwork === "GLO") {
          smsRecipient = "127";
          smsMessage = `SHARE ${targetPhone}`;
        }

        const commandPayload = {
          reference,
          deviceId: activeDevice.id,
          type: "SEND_SMS",
          recipient: smsRecipient,
          message: smsMessage,
          targetPhone,
          slotIndex,
          simSlot: slotIndex,
          amount: cost,
          network: resolvedNetwork,
          planId: resolvedPlanCode,
        };

        await prisma.gsmCommand.create({
          data: {
            reference,
            deviceId: activeDevice.id,
            type: "SEND_SMS",
            status: "PENDING",
            payload: commandPayload,
          },
        }).catch(() => null);

        emitEvent("gateway-command", commandPayload, activeDevice.id);
        if (typeof emitGatewayCommand === "function") {
          emitGatewayCommand(activeDevice.id, commandPayload);
        }

        return res.status(200).json({
          success: true,
          status: "success",
          route: "OUR_GATEWAY",
          message: `Data bundle successfully queued via local gateway for ${targetPhone}.`,
          reference,
          data: {
            network: resolvedNetwork,
            network_id: resolvedNetworkId,
            plan_id: resolvedPlanCode,
            phone: targetPhone,
            amountCharged: cost,
          },
        });
      }
    } catch (gsmErr) {
      console.warn("Primary local gateway notice:", gsmErr.message);
    }

    // 4. STEP 2: FALLBACK TO UPSTREAM AYAX API
    try {
      const response = await ayaxClient.post("/data/purchase", {
        network: resolvedNetwork,
        network_id: resolvedNetworkId,
        phone: targetPhone,
        planCode: resolvedPlanCode,
        plan_id: resolvedPlanCode,
        amount: cost,
        reference,
      });

      if (response.data?.success || response.data?.status === "success") {
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESSFUL" },
        });

        return res.status(200).json({
          success: true,
          status: "success",
          route: "UPSTREAM_API",
          message: `Data bundle successfully delivered to ${targetPhone}.`,
          reference,
          data: response.data,
        });
      } else {
        throw new Error(response.data?.message || "Upstream Ayax API order failed");
      }
    } catch (apiErr) {
      console.error("Data purchase failure, initiating refund:", apiErr.response?.data || apiErr.message);

      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: `Refunded: ${apiErr.response?.data?.message || apiErr.message || "Provider Error"}`,
          },
        }),
        prisma.walletLedger.create({
          data: {
            userId: user.id,
            reference: `${reference}-REFUND`,
            type: "CREDIT",
            amount: cost,
            balanceBefore: balanceAfter,
            balanceAfter: balanceBefore,
            module: "REFUND",
            description: `Auto-refund for failed data order ${reference}`,
          },
        }),
      ]);

      return res.status(502).json({
        success: false,
        message: apiErr.response?.data?.message || "Failed to process data order. Your wallet has been refunded.",
      });
    }
  } catch (error) {
    console.error("Buy data error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   2. AIRTIME PURCHASE (PRIMARY GATEWAY FIRST + UPSTREAM)
====================================================== */
exports.buyAirtime = async (req, res) => {
  try {
    const user = req.user;
    const {
      network,
      network_id,
      networkId,
      phone,
      phoneNumber,
      amount,
    } = req.body;

    const targetPhone = cleanLocalPhone(phoneNumber || phone || "");
    const resolvedNetworkId = String(network_id || networkId || (network === "MTN" ? "1" : network === "AIRTEL" ? "2" : network === "9MOBILE" ? "3" : network === "GLO" ? "4" : "1")).trim();
    const resolvedNetwork = String(network || NETWORK_MAP[resolvedNetworkId] || "MTN").toUpperCase().trim();
    const cost = Number(amount);

    if (!resolvedNetwork || !targetPhone || !cost || isNaN(cost) || cost < 50) {
      return res.status(400).json({
        success: false,
        message: "Network, valid phone number, and a minimum amount of ₦50 are required.",
      });
    }

    const reference = "AYX_AIRTIME_" + crypto.randomBytes(6).toString("hex").toUpperCase();

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        success: false,
        message: "Insufficient wallet balance.",
        requiredAmount: cost,
        currentBalance: wallet ? Number(wallet.balance) : 0,
      });
    }

    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore - cost;

    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: balanceAfter },
      });

      const t = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "AIRTIME_PURCHASE",
          amount: cost,
          status: "PROCESSING",
          reference,
          description: `${resolvedNetwork} Airtime to ${targetPhone}`,
        },
      });

      await tx.walletLedger.create({
        data: {
          userId: user.id,
          reference,
          type: "DEBIT",
          amount: cost,
          balanceBefore,
          balanceAfter,
          module: "AIRTIME",
          description: `${resolvedNetwork} Airtime purchase for ${targetPhone}`,
        },
      });

      return { updatedWallet: w, transaction: t };
    });

    emitEvent("wallet-updated", {
      userId: user.id,
      wallet: updatedWallet,
    });

    // 1. STEP 1: CHECK LOCAL GSM MODEM GATEWAY (USSD AIRTIME VENDING)
    let activeDevice = null;
    let targetSim = null;

    try {
      activeDevice = await prisma.gsmDevice.findFirst({
        where: {
          status: "ONLINE",
          lastSeen: { gte: new Date(Date.now() - 3 * 60 * 1000) },
        },
        include: { sims: true },
        orderBy: { lastSeen: "desc" },
      });

      if (activeDevice && activeDevice.sims) {
        targetSim = activeDevice.sims.find(
          (s) =>
            s.status === "ACTIVE" &&
            (String(s.carrierName || "").toUpperCase().includes(resolvedNetwork) ||
             String(s.displayName || "").toUpperCase().includes(resolvedNetwork) ||
             String(s.network || "").toUpperCase().includes(resolvedNetwork))
        );
      }

      if (activeDevice && targetSim) {
        const slotIndex = Number(targetSim.slotIndex ?? 0);
        const gsmPin = process.env.GSM_AIRTIME_PIN || "1997";

        let ussdCode = "";
        if (resolvedNetwork === "MTN") {
          ussdCode = `*321*1*${targetPhone}*${cost}*${gsmPin}#`;
        } else if (resolvedNetwork === "AIRTEL") {
          ussdCode = `*432*1*${targetPhone}*${cost}*${gsmPin}#`;
        } else if (resolvedNetwork === "GLO") {
          ussdCode = `*131*${targetPhone}*${cost}*${gsmPin}#`;
        } else if (resolvedNetwork === "9MOBILE") {
          ussdCode = `*223*${gsmPin}*${cost}*${targetPhone}#`;
        }

        if (ussdCode) {
          const commandPayload = {
            reference,
            deviceId: activeDevice.id,
            type: "SEND_USSD",
            ussdCode,
            targetPhone,
            slotIndex,
            simSlot: slotIndex,
            amount: cost,
            network: resolvedNetwork,
          };

          await prisma.gsmCommand.create({
            data: {
              reference,
              deviceId: activeDevice.id,
              type: "SEND_USSD",
              status: "PENDING",
              payload: commandPayload,
            },
          }).catch(() => null);

          emitEvent("gateway-command", commandPayload, activeDevice.id);
          if (typeof emitGatewayCommand === "function") {
            emitGatewayCommand(activeDevice.id, commandPayload);
          }

          return res.status(200).json({
            success: true,
            status: "success",
            route: "OUR_GATEWAY",
            message: `Airtime of ₦${cost} queued on local modem for ${targetPhone}.`,
            reference,
            data: {
              network: resolvedNetwork,
              phone: targetPhone,
              amount: cost,
            },
          });
        }
      }
    } catch (gsmErr) {
      console.warn("Primary local modem airtime notice:", gsmErr.message);
    }

    // 2. STEP 2: FALLBACK TO UPSTREAM AYAX AIRTIME API
    try {
      const response = await ayaxClient.post("/airtime/purchase", {
        network: resolvedNetwork,
        network_id: resolvedNetworkId,
        phone: targetPhone,
        amount: cost,
        reference,
      });

      if (response.data?.success || response.data?.status === "success") {
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESSFUL" },
        });

        return res.status(200).json({
          success: true,
          status: "success",
          route: "UPSTREAM_API",
          message: `Airtime of ₦${cost} sent to ${targetPhone} successfully.`,
          reference,
          data: response.data,
        });
      } else {
        throw new Error(response.data?.message || "Upstream airtime delivery failed");
      }
    } catch (apiErr) {
      console.error("Airtime purchase failed, issuing refund:", apiErr.response?.data || apiErr.message);

      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: `Refunded: ${apiErr.response?.data?.message || apiErr.message || "Airtime Provider Error"}`,
          },
        }),
        prisma.walletLedger.create({
          data: {
            userId: user.id,
            reference: `${reference}-REFUND`,
            type: "CREDIT",
            amount: cost,
            balanceBefore: balanceAfter,
            balanceAfter: balanceBefore,
            module: "REFUND",
            description: `Auto-refund for failed airtime order ${reference}`,
          },
        }),
      ]);

      return res.status(502).json({
        success: false,
        message: apiErr.response?.data?.message || "Failed to deliver airtime. Wallet refunded.",
      });
    }
  } catch (error) {
    console.error("Buy airtime error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   3. ELECTRICITY BILL PAYMENT (DISCO TOKENS)
====================================================== */
exports.payElectricity = async (req, res) => {
  try {
    const user = req.user;
    const { disco, meterNumber, meterType, amount } = req.body;

    if (!disco || !meterNumber || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Disco name, valid meter number, and a positive amount are required.",
      });
    }

    const cost = Number(amount);
    const reference = "AYX_ELEC_" + crypto.randomBytes(6).toString("hex").toUpperCase();

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        success: false,
        message: "Insufficient wallet balance.",
        requiredAmount: cost,
        currentBalance: wallet ? Number(wallet.balance) : 0,
      });
    }

    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore - cost;

    const { updatedWallet } = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: balanceAfter },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "ELECTRICITY",
          amount: cost,
          status: "PROCESSING",
          reference,
          description: `${disco.toUpperCase()} Electricity for Meter ${meterNumber}`,
        },
      });

      await tx.walletLedger.create({
        data: {
          userId: user.id,
          reference,
          type: "DEBIT",
          amount: cost,
          balanceBefore,
          balanceAfter,
          module: "BILLS",
          description: `${disco} electricity token purchase for ${meterNumber}`,
        },
      });

      return { updatedWallet: w };
    });

    emitEvent("wallet-updated", {
      userId: user.id,
      wallet: updatedWallet,
    });

    try {
      const response = await ayaxClient.post("/electricity/purchase", {
        disco,
        meterNumber,
        meterType: meterType || "PREPAID",
        amount: cost,
        reference,
      });

      if (response.data?.success || response.data?.status === "success") {
        const token =
          response.data?.token ||
          response.data?.data?.token ||
          response.data?.token_code ||
          "GENERATED";

        await prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "SUCCESSFUL",
            description: `Token: ${token} | Meter: ${meterNumber}`,
          },
        });

        return res.status(200).json({
          success: true,
          message: "Electricity token generated successfully.",
          token,
          reference,
          data: response.data,
        });
      } else {
        throw new Error(response.data?.message || "Electricity payment failed");
      }
    } catch (apiErr) {
      console.error("Electricity error, initiating refund:", apiErr.response?.data || apiErr.message);

      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: `Refunded: ${apiErr.response?.data?.message || "Electricity Gateway Error"}`,
          },
        }),
        prisma.walletLedger.create({
          data: {
            userId: user.id,
            reference: `${reference}-REFUND`,
            type: "CREDIT",
            amount: cost,
            balanceBefore: balanceAfter,
            balanceAfter: balanceBefore,
            module: "REFUND",
            description: `Auto-refund for failed electricity purchase ${reference}`,
          },
        }),
      ]);

      return res.status(502).json({
        success: false,
        message: apiErr.response?.data?.message || "Failed to process electricity. Wallet refunded.",
      });
    }
  } catch (error) {
    console.error("Electricity controller error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   4. CABLE TV SUBSCRIPTION (DSTV, GOTV, STARTIMES)
====================================================== */
exports.payCableTV = async (req, res) => {
  try {
    const user = req.user;
    const { provider, smartCard, packageId, amount } = req.body;

    if (!provider || !smartCard || !packageId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Provider, smartcard number, packageId, and a positive amount are required.",
      });
    }

    const cost = Number(amount);
    const reference = "AYX_CABLE_" + crypto.randomBytes(6).toString("hex").toUpperCase();

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        success: false,
        message: "Insufficient wallet balance.",
        requiredAmount: cost,
        currentBalance: wallet ? Number(wallet.balance) : 0,
      });
    }

    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore - cost;

    const { updatedWallet } = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: balanceAfter },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "CABLE_TV",
          amount: cost,
          status: "PROCESSING",
          reference,
          description: `${provider.toUpperCase()} Subscription for ${smartCard}`,
        },
      });

      await tx.walletLedger.create({
        data: {
          userId: user.id,
          reference,
          type: "DEBIT",
          amount: cost,
          balanceBefore,
          balanceAfter,
          module: "BILLS",
          description: `${provider} subscription purchase for ${smartCard}`,
        },
      });

      return { updatedWallet: w };
    });

    emitEvent("wallet-updated", {
      userId: user.id,
      wallet: updatedWallet,
    });

    try {
      const response = await ayaxClient.post("/cable/purchase", {
        provider,
        smartCard,
        packageId,
        amount: cost,
        reference,
      });

      if (response.data?.success || response.data?.status === "success") {
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESSFUL" },
        });

        return res.status(200).json({
          success: true,
          message: `${provider} subscription activated successfully for ${smartCard}.`,
          reference,
          data: response.data,
        });
      } else {
        throw new Error(response.data?.message || "Cable TV activation failed");
      }
    } catch (apiErr) {
      console.error("Cable TV error, issuing refund:", apiErr.response?.data || apiErr.message);

      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: `Refunded: ${apiErr.response?.data?.message || "Cable TV Gateway Error"}`,
          },
        }),
        prisma.walletLedger.create({
          data: {
            userId: user.id,
            reference: `${reference}-REFUND`,
            type: "CREDIT",
            amount: cost,
            balanceBefore: balanceAfter,
            balanceAfter: balanceBefore,
            module: "REFUND",
            description: `Auto-refund for failed cable TV order ${reference}`,
          },
        }),
      ]);

      return res.status(502).json({
        success: false,
        message: apiErr.response?.data?.message || "Failed to activate cable plan. Wallet refunded.",
      });
    }
  } catch (error) {
    console.error("Cable TV controller error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};