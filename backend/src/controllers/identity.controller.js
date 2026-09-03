const prisma = require("../config/prisma");
const axios = require("axios");
const prembly = require("../services/prembly.service");

/* ======================================================
   HELPER FUNCTIONS
====================================================== */

// Helper don kiran Upstream Identity Provider
async function callIdentityProvider(provider, endpoint, payload) {
  const url = `${provider.baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

  const headers = {
    "Content-Type": "application/json",
    ...(provider.appId ? { "app-id": provider.appId } : {}),
    ...(provider.apiKey
      ? {
          Authorization: `Bearer ${provider.apiKey}`,
          "x-api-key": provider.apiKey,
        }
      : {}),
    ...(provider.secretKey ? { "x-secret-key": provider.secretKey } : {}),
  };

  const response = await axios.post(url, payload, {
    headers,
    timeout: provider.timeoutMs || 30000,
  });

  return response.data;
}

// Helper don nemo active provider ko dawowa Prembly Env
async function getActiveProviders() {
  try {
    const providers = await prisma.apiProvider.findMany({
      where: {
        category: "IDENTITY",
        status: "ACTIVE",
      },
      orderBy: { priority: "asc" },
    });
    return providers || [];
  } catch (err) {
    console.warn("Could not query apiProvider table, using default adapter:", err.message);
    return [];
  }
}

/* ======================================================
   1. NIN VERIFICATION (SLIP PRINTING DATA)
   POST /api/v1/identity/nin/verify
====================================================== */
exports.verifyNin = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const { nin, slipType = "Standard Slip", reference } = req.body;

    const cleanNin = String(nin || "").trim();
    if (!cleanNin || cleanNin.length !== 11) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "A valid 11-digit National Identity Number (NIN) is required.",
      });
    }

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    // 1. Nemo Farashi daga ServicePricing
    const pricing = await prisma.servicePricing.findFirst({
      where: {
        category: "IDENTITY",
        enabled: true,
        tier: userTier,
        OR: [
          { serviceCode: "NIN_VERIFY" },
          { serviceCode: { contains: "NIN" } },
          { serviceName: { contains: "NIN Verification", mode: "insensitive" } },
        ],
      },
    });

    const cost = Number(pricing?.sellingPrice || 100);

    // 2. Duba Kudin Wallet
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_BALANCE",
        message: `Insufficient wallet balance. NGN ${cost} is required for NIN verification.`,
      });
    }

    const txRef = reference || `AYAX_NIN_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // 3. Cire kudi a Transaction
    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: cost } },
      });

      const t = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEBIT",
          service: "NIN VERIFICATION",
          amount: cost,
          status: "PENDING",
          reference: txRef,
          description: `NIN Verification for [${cleanNin}] (${slipType})`,
        },
      });

      return { updatedWallet: w, transaction: t };
    });

    // 4. Dynamic Provider Dispatch tare da Fallback
    const providers = await getActiveProviders();
    let upstreamData = null;

    for (const provider of providers) {
      try {
        upstreamData = await callIdentityProvider(provider, "/nin/verify", {
          nin: cleanNin,
          slipType,
          reference: txRef,
        });

        if (upstreamData && (upstreamData.status === "success" || upstreamData.success || upstreamData.status === true)) {
          await prisma.apiProvider.update({
            where: { id: provider.id },
            data: { successCount: { increment: 1 }, lastSuccessAt: new Date() },
          }).catch(() => null);
          break;
        }
      } catch (err) {
        console.error(`Provider [${provider.name}] failed:`, err.message);
        await prisma.apiProvider.update({
          where: { id: provider.id },
          data: { failureCount: { increment: 1 }, lastFailureAt: new Date() },
        }).catch(() => null);
      }
    }

    // Direct Prembly Fallback idan database providers sun gaza ko babu su
    if (!upstreamData || (!upstreamData.success && upstreamData.status !== "success" && upstreamData.status !== true)) {
      console.log(`[NIN VERIFY] Falling back to default Prembly integration for ${cleanNin}...`);
      const premblyRes = await prembly.verifyNIN(cleanNin);

      if (premblyRes && premblyRes.success) {
        upstreamData = {
          success: true,
          status: "success",
          data: {
            nin: premblyRes.nin,
            firstName: premblyRes.firstName,
            surname: premblyRes.surname,
            middleName: premblyRes.middleName,
            phone: premblyRes.phone,
            gender: premblyRes.gender,
            dob: premblyRes.dob,
            photo: premblyRes.photo,
            address: premblyRes.address,
            raw: premblyRes.raw,
          },
        };
      }
    }

    // 5. Refund idan dukkan providers sun fadi
    if (!upstreamData || (!upstreamData.success && upstreamData.status !== "success" && upstreamData.status !== true)) {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED", description: `FAILED: NIN Verification for [${cleanNin}] (Refunded NGN ${cost})` },
        }),
      ]);

      return res.status(502).json({
        status: "error",
        code: "GATEWAY_ERROR",
        message: "Identity verification gateway currently unavailable or NIN not found. Your wallet was refunded.",
      });
    }

    // 6. Tabbatar da Nasara (SUCCESSFUL)
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCESSFUL" },
    });

    return res.status(200).json({
      status: "success",
      code: "VERIFICATION_SUCCESSFUL",
      message: "NIN verified successfully.",
      data: {
        reference: txRef,
        nin: cleanNin,
        slipType,
        details: upstreamData.data || upstreamData,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    console.error("NIN Verification error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "An error occurred during NIN verification.",
    });
  }
};

/* ======================================================
   2. BVN VERIFICATION
   POST /api/v1/identity/bvn/verify
====================================================== */
exports.verifyBvn = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const { bvn, reference } = req.body;

    const cleanBvn = String(bvn || "").trim();
    if (!cleanBvn || cleanBvn.length !== 11) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "A valid 11-digit Bank Verification Number (BVN) is required.",
      });
    }

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    const pricing = await prisma.servicePricing.findFirst({
      where: {
        category: "IDENTITY",
        enabled: true,
        tier: userTier,
        OR: [
          { serviceCode: "BVN_VERIFY" },
          { serviceCode: { contains: "BVN" } },
          { serviceName: { contains: "BVN Verification", mode: "insensitive" } },
        ],
      },
    });

    const cost = Number(pricing?.sellingPrice || 70);

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_BALANCE",
        message: `Insufficient wallet balance. NGN ${cost} is required for BVN verification.`,
      });
    }

    const txRef = reference || `AYAX_BVN_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: cost } },
      });

      const t = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEBIT",
          service: "BVN VERIFICATION",
          amount: cost,
          status: "PENDING",
          reference: txRef,
          description: `BVN Verification for [${cleanBvn}]`,
        },
      });

      return { updatedWallet: w, transaction: t };
    });

    const providers = await getActiveProviders();
    let upstreamData = null;

    for (const provider of providers) {
      try {
        upstreamData = await callIdentityProvider(provider, "/bvn/verify", {
          bvn: cleanBvn,
          reference: txRef,
        });

        if (upstreamData && (upstreamData.status === "success" || upstreamData.success || upstreamData.status === true)) {
          break;
        }
      } catch (err) {
        console.error(`Provider [${provider.name}] failed for BVN:`, err.message);
      }
    }

    // Direct Prembly Fallback
    if (!upstreamData || (!upstreamData.success && upstreamData.status !== "success" && upstreamData.status !== true)) {
      console.log(`[BVN VERIFY] Falling back to Prembly for ${cleanBvn}...`);
      const premblyRes = await prembly.verifyBVN(cleanBvn);

      if (premblyRes && premblyRes.success) {
        upstreamData = {
          success: true,
          status: "success",
          data: {
            bvn: premblyRes.bvn,
            firstName: premblyRes.firstName,
            surname: premblyRes.surname,
            middleName: premblyRes.middleName,
            phone: premblyRes.phone,
            gender: premblyRes.gender,
            dob: premblyRes.dob,
            photo: premblyRes.photo,
            raw: premblyRes.raw,
          },
        };
      }
    }

    if (!upstreamData || (!upstreamData.success && upstreamData.status !== "success" && upstreamData.status !== true)) {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED", description: `FAILED: BVN Verification for [${cleanBvn}] (Refunded NGN ${cost})` },
        }),
      ]);

      return res.status(502).json({
        status: "error",
        code: "GATEWAY_ERROR",
        message: "BVN validation gateway currently unavailable or BVN not found. Your wallet was refunded.",
      });
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCESSFUL" },
    });

    return res.status(200).json({
      status: "success",
      code: "VERIFICATION_SUCCESSFUL",
      message: "BVN verified successfully.",
      data: {
        reference: txRef,
        bvn: cleanBvn,
        details: upstreamData.data || upstreamData,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    console.error("BVN Verification error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "An error occurred during BVN verification.",
    });
  }
};

/* ======================================================
   3. NIN VALIDATION (RESOLUTION SERVICES)
   POST /api/v1/identity/nin/validate
====================================================== */
exports.validateNinIssue = async (req, res) => {
  try {
    const user = req.user || req.apiKeyUser;
    const { nin, issueType = "BANK_MISMATCH", reference } = req.body;

    const cleanNin = String(nin || "").trim();
    if (!cleanNin || cleanNin.length !== 11) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "An 11-digit NIN is required for issue resolution.",
      });
    }

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const userTier = String(user.tier || (user.role === "DEVELOPER" ? "STANDARD" : "REGULAR")).toUpperCase();

    const pricing = await prisma.servicePricing.findFirst({
      where: {
        category: "IDENTITY",
        enabled: true,
        tier: userTier,
        OR: [
          { serviceCode: `NIN_VALIDATION_${issueType}` },
          { serviceCode: { contains: issueType } },
          { serviceName: { contains: "NIN Validation", mode: "insensitive" } },
        ],
      },
    });

    const cost = Number(pricing?.sellingPrice || 1500);

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet || Number(wallet.balance) < cost) {
      return res.status(402).json({
        status: "error",
        code: "INSUFFICIENT_BALANCE",
        message: `Insufficient balance. NGN ${cost} is required for NIN issue validation.`,
      });
    }

    const txRef = reference || `AYAX_VAL_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const { updatedWallet, transaction } = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: cost } },
      });

      const t = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEBIT",
          service: "NIN VALIDATION",
          amount: cost,
          status: "PENDING",
          reference: txRef,
          description: `NIN Validation Issue: ${issueType} for [${cleanNin}]`,
        },
      });

      return { updatedWallet: w, transaction: t };
    });

    const providers = await getActiveProviders();
    let upstreamData = null;

    for (const provider of providers) {
      try {
        upstreamData = await callIdentityProvider(provider, "/nin/validate", {
          nin: cleanNin,
          issueType,
          reference: txRef,
        });

        if (upstreamData && (upstreamData.status === "success" || upstreamData.success || upstreamData.status === true)) {
          break;
        }
      } catch (err) {
        console.error(`Provider [${provider.name}] failed for validation:`, err.message);
      }
    }

    if (!upstreamData || (!upstreamData.success && upstreamData.status !== "success" && upstreamData.status !== true)) {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: cost } },
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED", description: `FAILED: NIN Validation for [${cleanNin}] (Refunded NGN ${cost})` },
        }),
      ]);

      return res.status(502).json({
        status: "error",
        code: "VALIDATION_FAILED",
        message: "NIN Validation submission failed at NIMC gateway. Wallet refunded.",
      });
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCESSFUL" },
    });

    return res.status(200).json({
      status: "success",
      code: "VALIDATION_QUEUED",
      message: "NIN validation issue submitted successfully for clearance.",
      data: {
        reference: txRef,
        nin: cleanNin,
        issueType,
        result: upstreamData.data || upstreamData,
        amountCharged: cost,
        walletBalance: updatedWallet.balance,
      },
    });
  } catch (error) {
    console.error("NIN Validation error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "An error occurred during NIN issue validation.",
    });
  }
};