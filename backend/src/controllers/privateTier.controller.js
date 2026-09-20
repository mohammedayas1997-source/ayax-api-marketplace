const crypto = require("crypto");
const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

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
   1. SUBMIT REQUEST FOR PRIVATE ENTERPRISE ACTIVATION
   POST /api/v1/private-tier/request
====================================================== */
exports.submitForPrivateActivation = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { apiKey, note } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "API Key is required to request dedicated VIP routing.",
      });
    }

    const cleanKey = apiKey.trim();
    const keyHash = crypto.createHash("sha256").update(cleanKey).digest("hex");
    const strippedPrefix = cleanKey.replace(/^ayax_live_/, "");
    const strippedHash = crypto.createHash("sha256").update(strippedPrefix).digest("hex");

    // Verify key ownership either plain or hashed
    const verifiedKey = await prisma.apiKey.findFirst({
      where: {
        userId: userId,
        status: "ACTIVE",
        OR: [
          { key: cleanKey },
          { key: keyHash },
          { key: strippedPrefix },
          { key: strippedHash },
          ...(prisma.apiKey.fields?.hashedKey ? [{ hashedKey: keyHash }] : []),
        ],
      },
      include: { user: true },
    });

    if (!verifiedKey) {
      return res.status(403).json({
        success: false,
        message: "Invalid API Key: This key does not belong to your account or is inactive.",
      });
    }

    const targetEmail = verifiedKey.user?.email || req.user?.email;

    const record = await prisma.privateTierWhitelist.upsert({
      where: { userId: userId },
      update: {
        apiKey: cleanKey,
        userEmail: targetEmail,
        status: "PENDING",
        isActive: false,
        note: note || "Custom wholesale rate requested",
        requestedAt: new Date(),
      },
      create: {
        userId: userId,
        userEmail: targetEmail,
        apiKey: cleanKey,
        status: "PENDING",
        isActive: false,
        note: note || "Custom wholesale rate requested",
        requestedAt: new Date(),
      },
    });

    emitEvent("admin-alert", {
      type: "PRIVATE_TIER_REQUEST",
      message: `User ${targetEmail} requested enterprise wholesale pricing.`,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Dedicated enterprise routing requested. Awaiting administrator activation.",
      status: record.status,
      data: record,
    });
  } catch (error) {
    console.error("Submit private activation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   2. FETCH ALL PENDING AND WHITELISTED ACCOUNTS
   GET /api/v1/private-tier/list
====================================================== */
exports.getPendingActivations = async (req, res) => {
  try {
    const list = await prisma.privateTierWhitelist.findMany({
      orderBy: { requestedAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (error) {
    console.error("Get pending activations error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   3. APPROVE OR SUSPEND USER TIER (ADMIN ACTION)
   POST /api/v1/private-tier/manage
====================================================== */
exports.activateUserPrivateTier = async (req, res) => {
  try {
    const {
      targetUserId,
      customMtnPrice,
      customAirtelPrice,
      customGloPrice,
      custom9mobilePrice,
      discountPerGb,
      action = "APPROVE",
    } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "targetUserId is required.",
      });
    }

    if (action === "APPROVE") {
      const activated = await prisma.privateTierWhitelist.update({
        where: { userId: targetUserId },
        data: {
          isActive: true,
          status: "APPROVED",
          activatedAt: new Date(),
          approvedBy: req.user?.email || "SuperAdmin",
          customMtnPrice: customMtnPrice !== undefined ? Number(customMtnPrice) : null,
          customAirtelPrice: customAirtelPrice !== undefined ? Number(customAirtelPrice) : null,
          customGloPrice: customGloPrice !== undefined ? Number(customGloPrice) : null,
          custom9mobilePrice: custom9mobilePrice !== undefined ? Number(custom9mobilePrice) : null,
          discountPerGb: discountPerGb !== undefined ? Number(discountPerGb) : 30.0,
        },
      });

      emitEvent("tier-status-changed", {
        userId: targetUserId,
        status: "APPROVED",
        isActive: true,
      });

      return res.status(200).json({
        success: true,
        message: `Account [${activated.userEmail}] successfully activated on private VIP wholesale tier!`,
        data: activated,
      });
    } else {
      const suspended = await prisma.privateTierWhitelist.update({
        where: { userId: targetUserId },
        data: {
          isActive: false,
          status: "SUSPENDED",
        },
      });

      emitEvent("tier-status-changed", {
        userId: targetUserId,
        status: "SUSPENDED",
        isActive: false,
      });

      return res.status(200).json({
        success: true,
        message: "User private tier has been suspended.",
        data: suspended,
      });
    }
  } catch (error) {
    console.error("Activate user private tier error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   4. SUPERADMIN DIRECT TERMINAL INSTANT ACTIVATION
   POST /api/v1/private-tier/direct-activate
====================================================== */
exports.directAdminActivate = async (req, res) => {
  try {
    const {
      apiKey,
      customMtnPrice,
      customAirtelPrice,
      customGloPrice,
      custom9mobilePrice,
      discountPerGb,
      note,
    } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "API Key, customer email, or registered phone number is required.",
      });
    }

    const cleanInput = String(apiKey).trim();
    let targetUserId = null;
    let targetEmail = null;

    // A. Direct Email Search
    if (cleanInput.includes("@")) {
      const userRecord = await prisma.user.findUnique({
        where: { email: cleanInput.toLowerCase() },
      });
      if (userRecord) {
        targetUserId = userRecord.id;
        targetEmail = userRecord.email;
      }
    }

    // B. Direct Phone Number Search
    if (!targetUserId && /^\d+$/.test(cleanInput.replace(/\+/g, ""))) {
      const formattedPhone = cleanLocalPhone(cleanInput);
      const userByPhone = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: formattedPhone },
            { phone: cleanInput },
            { phoneNumber: formattedPhone },
            { phoneNumber: cleanInput },
          ],
        },
      });

      if (userByPhone) {
        targetUserId = userByPhone.id;
        targetEmail = userByPhone.email;
      }
    }

    // C. Plain Text and SHA-256 Hash Matching on ApiKey table
    const keyHash = crypto.createHash("sha256").update(cleanInput).digest("hex");
    const strippedPrefix = cleanInput.replace(/^ayax_live_/, "");
    const strippedHash = crypto.createHash("sha256").update(strippedPrefix).digest("hex");

    if (!targetUserId && prisma.apiKey) {
      try {
        const matchedKey = await prisma.apiKey.findFirst({
          where: {
            OR: [
              { key: cleanInput },
              { key: keyHash },
              { key: strippedPrefix },
              { key: strippedHash },
              ...(prisma.apiKey.fields?.hashedKey ? [{ hashedKey: keyHash }] : []),
              ...(prisma.apiKey.fields?.apiKey ? [{ apiKey: cleanInput }] : []),
            ],
          },
          include: { user: true },
        });

        if (matchedKey) {
          targetUserId = matchedKey.userId || matchedKey.user?.id;
          targetEmail = matchedKey.user?.email || matchedKey.email;
        }
      } catch (err) {
        console.warn("ApiKey lookup fallback notice:", err.message);
      }
    }

    // D. User Table Relation Search
    if (!targetUserId) {
      try {
        const userRelation = await prisma.user.findFirst({
          where: {
            apiKeys: {
              some: {
                OR: [
                  { key: cleanInput },
                  { key: keyHash },
                  { key: strippedPrefix },
                ],
              },
            },
          },
        });

        if (userRelation) {
          targetUserId = userRelation.id;
          targetEmail = userRelation.email;
        }
      } catch (_) {}
    }

    // E. Direct Raw SQL Fallback (Database table casing compatibility)
    if (!targetUserId) {
      try {
        const rawResults = await prisma.$queryRaw`
          SELECT "userId" FROM "ApiKey" 
          WHERE "key" IN (${cleanInput}, ${keyHash}, ${strippedPrefix}, ${strippedHash})
          LIMIT 1
        `;
        if (rawResults && rawResults.length > 0) {
          targetUserId = rawResults[0].userId;
          const userObj = await prisma.user.findUnique({ where: { id: targetUserId } });
          targetEmail = userObj?.email;
        }
      } catch (_) {}
    }

    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: `Account not found for (${cleanInput.slice(0, 16)}...). You can paste the customer's registered email or phone number directly into this field to activate them instantly.`,
      });
    }

    // Upsert whitelist entry
    const activated = await prisma.privateTierWhitelist.upsert({
      where: { userId: targetUserId },
      update: {
        apiKey: cleanInput,
        userEmail: targetEmail,
        isActive: true,
        status: "APPROVED",
        activatedAt: new Date(),
        approvedBy: req.user?.email || "SuperAdmin",
        customMtnPrice: customMtnPrice !== undefined ? Number(customMtnPrice) : null,
        customAirtelPrice: customAirtelPrice !== undefined ? Number(customAirtelPrice) : null,
        customGloPrice: customGloPrice !== undefined ? Number(customGloPrice) : null,
        custom9mobilePrice: custom9mobilePrice !== undefined ? Number(custom9mobilePrice) : null,
        discountPerGb: discountPerGb !== undefined ? Number(discountPerGb) : 30.0,
        note: note || "Manual SuperAdmin activation",
      },
      create: {
        userId: targetUserId,
        userEmail: targetEmail,
        apiKey: cleanInput,
        isActive: true,
        status: "APPROVED",
        activatedAt: new Date(),
        approvedBy: req.user?.email || "SuperAdmin",
        customMtnPrice: customMtnPrice !== undefined ? Number(customMtnPrice) : null,
        customAirtelPrice: customAirtelPrice !== undefined ? Number(customAirtelPrice) : null,
        customGloPrice: customGloPrice !== undefined ? Number(customGloPrice) : null,
        custom9mobilePrice: custom9mobilePrice !== undefined ? Number(custom9mobilePrice) : null,
        discountPerGb: discountPerGb !== undefined ? Number(discountPerGb) : 30.0,
        note: note || "Manual SuperAdmin activation",
      },
    });

    emitEvent("whitelist-activated", {
      userId: targetUserId,
      email: targetEmail,
      status: "APPROVED",
      isActive: true,
    });

    return res.status(200).json({
      success: true,
      message: `VIP Wholesale Channel successfully activated for ${targetEmail}!`,
      data: activated,
    });
  } catch (error) {
    console.error("Direct activation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};