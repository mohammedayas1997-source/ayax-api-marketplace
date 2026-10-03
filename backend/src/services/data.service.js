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
            description: `${network} Data Transfer (${targetPlan}) to ${phone}`,
          },
        });
      }
    } catch (_) {}

    // =========================================================================
    // MATAKI NA 1: TURAWA ZUWA GSM GATEWAY MODEM TA STEP-BY-STEP USSD
    // =========================================================================
    try {
      console.log(`📡 [GSM GATEWAY]: Checking SIM pool for ${network} Transfer...`);

      let activeDevice = await prisma.gsmDevice.findFirst({
        where: {
          OR: [
            { status: "ONLINE" },
            { lastSeen: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
          ],
        },
        include: { sims: true },
        orderBy: { lastSeen: "desc" },
      });

      if (!activeDevice) {
        activeDevice = await prisma.gsmDevice.findFirst({
          include: { sims: true },
          orderBy: { createdAt: "desc" },
        });
      }

      if (activeDevice && Array.isArray(activeDevice.sims) && activeDevice.sims.length > 0) {
        const matchingSims = activeDevice.sims.filter((s) => {
          const simNet = String(s.carrierName || s.displayName || s.network || "").toUpperCase();
          return simNet.includes(network);
        });

        // Duba Quota: 5GB a rana, 10GB a wata (MTN)
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

          let ussdCode = "*312*7#";
          let steps = [];

          // ==============================================================
          // TSARIN STEP-BY-STEP USSD DON KAUCEWA "SERVICE UNAVAILABLE"
          // A MTN 312:
          // Mataki 1: Danna *312*7# (Share / Transfer Data)
          // Mataki 2: Zabi 1 (Transfer Data)
          // Mataki 3: Shigar da lambar waya
          // Mataki 4: Shigar da adadin data (1000MB)
          // Mataki 5: Shigar da PIN
          // ==============================================================
          if (network === "MTN") {
            let mbAmount = "1000"; // 1GB
            if (targetPlan === "17" || targetPlan.includes("500") || targetPlan === "500MB") {
              mbAmount = "500";
            } else if (targetPlan === "101" || targetPlan.includes("2GB")) {
              mbAmount = "2000";
            }

            // Maimakon dogon lamba mai dunkule (*312*7*1*...), yi amfani da steps:
            ussdCode = "*312*7#";
            steps = ["1", phone, mbAmount, pin];
          } else if (network === "AIRTEL") {
            ussdCode = "*321#";
            steps = ["2", phone, "1000", pin];
          } else if (network === "GLO") {
            ussdCode = "*127*01*" + phone + "#";
            steps = [];
          } else if (network === "9MOBILE") {
            ussdCode = "*229#"
            steps = [phone];
          }

          console.log(`🚀 [GSM GATEWAY DISPATCH]: Slot ${slotIndex} executing USSD: "${ussdCode}" with steps:`, steps);

          const commandPayload = {
            reference,
            commandId: reference,
            id: reference,
            deviceId: activeDevice.id,
            type: "USSD",
            action: "USSD",
            service: "DATA",
            code: ussdCode,
            ussdCode: ussdCode,
            ussd: ussdCode,
            text: ussdCode,
            rootCode: ussdCode,
            steps: steps,
            recipient: phone,
            sendTo: phone,
            phone: phone,
            phoneNumber: phone,
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
              type: "USSD",
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

          // Single socket emission
          try {
            if (typeof emitGatewayCommand === "function") {
              emitGatewayCommand(activeDevice.id, commandPayload);
            } else {
              emitEvent("gateway-command", commandPayload, activeDevice.id);
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
            message: `${network} Data Transfer command sent to GSM Gateway via USSD!`,
            reference,
            data: {
              reference,
              network,
              phone,
              plan: targetPlan,
              deviceId: activeDevice.id,
              simSlot: slotIndex,
              ussdCode,
              steps,
            },
          };
        }
      }
    } catch (gsmErr) {
      console.warn("⚠️ [GSM GATEWAY NOTICE]:", gsmErr.message, "Switching to Fallback...");
    }

    // =========================================================================
    // MATAKI NA 2: FALLBACK ZUWA EXTERNAL API (AL-IHSAN DATASUB)
    // =========================================================================
    try {
      console.log(`🌐 [FALLBACK]: Attempting Al-Ihsan API for ${network} Data...`);

      const rawToken =
        process.env.ALIHSAN_AUTH_TOKEN ||
        process.env.ALIHSAN_TOKEN ||
        process.env.ALIHSAN_API_KEY ||
        process.env.VTU_API_KEY ||
        "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x";

      const cleanToken = String(rawToken)
        .replace(/^Token\s+/i, "")
        .replace(/^Bearer\s+/i, "")
        .trim();

      const netMap = { MTN: "1", AIRTEL: "2", "9MOBILE": "3", GLO: "4" };

      let alihsanPlanId = targetPlan;
      if (network === "MTN" && (targetPlan === "100" || targetPlan === "27")) {
        alihsanPlanId = "140";
      }

      const payload = {
        network: String(netMap[network] || "1"),
        plan_id: String(alihsanPlanId),
        mobile_number: String(phone),
        request_id: String(reference),
      };

      const res = await axios.post(
        "https://alihsandatasub.com.ng/api/v1/data.php",
        payload,
        {
          headers: {
            Authorization: cleanToken,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 40000,
        }
      );

      const resData = res.data || {};
      const statusText = String(
        resData.status || resData.Status || resData.success || ""
      ).toLowerCase();
      const messageText = String(
        resData.message || resData.msg || resData.desc || ""
      ).toLowerCase();

      const isSuccess =
        statusText === "success" ||
        statusText === "successful" ||
        statusText === "true" ||
        resData.success === true ||
        resData.code === 200 ||
        resData.code === "200" ||
        messageText.includes("success") ||
        messageText.includes("successful");

      if (isSuccess) {
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
          message: `${network} Data successfully sent to ${phone} via Al-Ihsan!`,
          reference,
          data: resData,
        };
      }

      throw new Error(resData.desc || resData.message || resData.msg || "Vendor rejected order");
    } catch (externalErr) {
      const errRes = externalErr.response?.data;
      const errMsg = errRes?.desc || errRes?.message || errRes?.msg || externalErr.message;
      console.error("External delivery failed:", errMsg);

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
            description: `Refunded: ${errMsg}`,
          },
        }).catch(() => {});
      }

      throw new Error(`Data delivery failed: ${errMsg}`);
    }
  }
}

module.exports = new DataService();