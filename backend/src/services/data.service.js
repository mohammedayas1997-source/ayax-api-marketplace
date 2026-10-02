const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const { emitEvent, emitGatewayCommand } = require("../config/socket");

const prisma = new PrismaClient();

const NETWORK_LOOKUP = {
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

class DataService {
  async purchaseData(params) {
    const { planCode, planId, amount } = params;
    const phone = cleanLocalPhone(params.phone || params.phoneNumber || "");

    const rawNet = String(params.network || "MTN").toUpperCase().trim();
    const network = NETWORK_LOOKUP[rawNet] || rawNet;
    const targetPlan = String(planCode || planId || "100").trim();
    const purchaseAmount = Number(amount || 0);

    // 1. Tattara mai amfani
    const targetId = params.userId || params.id || params.user?.id || params.user?._id;
    const targetEmail = params.email || params.user?.email;

    let user = null;
    if (targetId) {
      user = await prisma.user.findUnique({ where: { id: targetId } });
    } else if (targetEmail) {
      user = await prisma.user.findUnique({ where: { email: targetEmail } });
    }

    if (!user) {
      throw new Error("User account not found. Please verify credentials.");
    }

    // 2. Duba Ainihin Wallet
    let wallet = null;
    if (prisma.wallet) {
      wallet = await prisma.wallet.findFirst({
        where: {
          OR: [{ userId: user.id }, { id: user.id }],
        },
      });
    }

    const currentBalance = Number(wallet?.balance ?? user.walletBalance ?? user.balance ?? 0);

    if (purchaseAmount > 0 && currentBalance < purchaseAmount && user.role !== "ADMIN") {
      throw new Error(
        `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but ₦${purchaseAmount.toLocaleString()} is required.`
      );
    }

    // 3. Rage Kuɗin a Wallet (Debit)
    if (purchaseAmount > 0) {
      if (wallet && prisma.wallet) {
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: purchaseAmount } },
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { walletBalance: { decrement: purchaseAmount } },
        });
      }
    }

    const reference = params.reference || `AYX_DATA_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    let transactionRecord = null;
    try {
      if (prisma.transaction) {
        transactionRecord = await prisma.transaction.create({
          data: {
            userId: user.id,
            type: "DEBIT",
            service: `${network} DATA`,
            amount: purchaseAmount,
            reference,
            status: "PROCESSING",
            description: `${network} Data (${targetPlan}) to ${phone}`,
          },
        });
      }
    } catch (_) {}

    // =========================================================================
    // MATAKI NA 1: TURAWA ZUWA GSM GATEWAY MODEM (MTN, AIRTEL, GLO, 9MOBILE)
    // =========================================================================
    try {
      console.log(`📡 [GSM GATEWAY]: Checking SIM pool for ${network}...`);

      const activeDevice = await prisma.gsmDevice.findFirst({
        where: {
          status: "ONLINE",
          lastSeen: { gte: new Date(Date.now() - 3 * 60 * 1000) },
        },
        include: { sims: true },
        orderBy: { lastSeen: "desc" },
      });

      if (activeDevice && Array.isArray(activeDevice.sims) && activeDevice.sims.length > 0) {
        const matchingSims = activeDevice.sims.filter((s) => {
          const simNet = String(s.carrierName || s.displayName || s.network || "").toUpperCase();
          return s.status === "ACTIVE" && simNet.includes(network);
        });

        // Duba Quota: 5GB a rana, 10GB a wata
        let targetSim = matchingSims.find((s) => {
          const daily = Number(s.dailySoldGB || 0);
          const monthly = Number(s.monthlySoldGB || 0);
          if (network === "MTN") return daily < 5 && monthly < 10;
          return daily < 10;
        });

        if (!targetSim && matchingSims.length > 0) {
          targetSim = matchingSims[0];
        }

        if (targetSim) {
          const slotIndex = Number(targetSim.slotIndex ?? 0);
          const pin = process.env.GSM_DATA_PIN || "1997";

          let recipient = "312";
          let message = `SMEB ${phone} ${pin}`;

          if (network === "AIRTEL") {
            recipient = "141";
            message = `SHARE ${phone} 1GB ${pin}`;
          } else if (network === "GLO") {
            recipient = "127";
            message = `SHARE ${phone}`;
          } else if (network === "9MOBILE") {
            recipient = "229";
            message = `PIN ${pin}`;
          }

          const commandPayload = {
            reference,
            commandId: reference,
            id: reference,
            deviceId: activeDevice.id,
            type: "SEND_SMS",
            action: "SEND_SMS",
            service: "DATA",
            recipient,
            sendTo: recipient,
            phone: recipient,
            phoneNumber: recipient,
            message,
            smsBody: message,
            smsText: message,
            targetPhone: phone,
            slotIndex,
            simSlot: slotIndex,
            amount: purchaseAmount,
            network,
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

          if (prisma.gsmSim) {
            await prisma.gsmSim.update({
              where: { id: targetSim.id },
              data: {
                dailySoldGB: { increment: 1 },
                monthlySoldGB: { increment: 1 },
              },
            }).catch(() => null);
          }

          try {
            emitEvent("gateway-command", commandPayload, activeDevice.id);
            emitEvent("command", commandPayload, activeDevice.id);
            if (typeof emitGatewayCommand === "function") {
              emitGatewayCommand(activeDevice.id, commandPayload);
            }
          } catch (socketErr) {
            console.warn("Socket notice:", socketErr.message);
          }

          if (transactionRecord && prisma.transaction) {
            await prisma.transaction.update({
              where: { id: transactionRecord.id },
              data: { status: "SUCCESSFUL" },
            }).catch(() => {});
          }

          return {
            success: true,
            status: "SUCCESSFUL",
            route: "GSM_GATEWAY",
            message: `${network} Data successfully dispatched via GSM Gateway!`,
            reference,
            data: {
              reference,
              network,
              phone,
              plan: targetPlan,
              deviceId: activeDevice.id,
              simSlot: slotIndex,
            },
          };
        }
      }
    } catch (gsmErr) {
      console.warn("GSM Gateway unavailable, cascading to external API:", gsmErr.message);
    }

    // =========================================================================
    // MATAKI NA 2: FALLBACK ZUWA EXTERNAL API (AL-IHSAN)
    // =========================================================================
    try {
      const rawToken =
        process.env.ALIHSAN_AUTH_TOKEN ||
        process.env.ALIHSAN_TOKEN ||
        process.env.ALIHSAN_API_KEY ||
        "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x";

      const token = rawToken.startsWith("Token ") ? rawToken : `Token ${rawToken.trim()}`;
      const netMap = { MTN: 1, AIRTEL: 2, "9MOBILE": 3, GLO: 4 };

      const res = await axios.post(
        "https://alihsandatasub.com.ng/api/data/",
        {
          network: netMap[network] || 1,
          plan: Number(targetPlan === "100" ? 140 : targetPlan),
          mobile_number: phone,
          Ported_number: true,
          reference,
        },
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 40000,
        }
      );

      const statusText = String(res.data?.status || res.data?.Status || "").toLowerCase();
      if (statusText === "success" || statusText === "successful" || statusText === "true") {
        if (transactionRecord && prisma.transaction) {
          await prisma.transaction.update({
            where: { id: transactionRecord.id },
            data: { status: "SUCCESSFUL" },
          }).catch(() => {});
        }

        return {
          success: true,
          status: "SUCCESSFUL",
          route: "ALIHSAN",
          message: `${network} Data successfully sent to ${phone}!`,
          reference,
          data: res.data,
        };
      }

      throw new Error(res.data?.message || res.data?.desc || "Vendor rejected order");
    } catch (externalErr) {
      console.error("External delivery failed:", externalErr.message);

      // Refund idan duk hanyoyin biyu sun gaza
      if (purchaseAmount > 0) {
        if (wallet && prisma.wallet) {
          await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: purchaseAmount } },
          });
        } else {
          await prisma.user.update({
            where: { id: user.id },
            data: { walletBalance: { increment: purchaseAmount } },
          });
        }
      }

      if (transactionRecord && prisma.transaction) {
        await prisma.transaction.update({
          where: { id: transactionRecord.id },
          data: {
            status: "FAILED",
            description: `Refunded: ${externalErr.message}`,
          },
        }).catch(() => {});
      }

      throw new Error(`Data delivery failed: ${externalErr.message}`);
    }
  }
}

module.exports = new DataService();