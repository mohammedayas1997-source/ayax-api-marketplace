const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 1. Submit request for private activation
exports.submitForPrivateActivation = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { apiKey, note } = req.body;

    if (!apiKey) {
      return res.status(400).json({ success: false, message: "API Key is required" });
    }

    const cleanKey = apiKey.trim();
    const keyHash = crypto.createHash("sha256").update(cleanKey).digest("hex");

    // Verify key ownership either plain or hashed
    const verifiedKey = await prisma.apiKey.findFirst({
      where: {
        userId: userId,
        status: "ACTIVE",
        OR: [
          { key: cleanKey },
          { key: keyHash },
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

    const record = await prisma.privateTierWhitelist.upsert({
      where: { userId: userId },
      update: {
        apiKey: cleanKey,
        userEmail: verifiedKey.user.email,
        status: "PENDING",
        isActive: false,
        note: note || "Custom wholesale rate requested",
      },
      create: {
        userId: userId,
        userEmail: verifiedKey.user.email,
        apiKey: cleanKey,
        status: "PENDING",
        isActive: false,
        note: note || "Custom wholesale rate requested",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Dedicated enterprise routing requested. Awaiting administrator activation.",
      status: record.status,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Fetch all pending and whitelisted accounts
exports.getPendingActivations = async (req, res) => {
  try {
    const list = await prisma.privateTierWhitelist.findMany({
      orderBy: { requestedAt: "desc" },
    });

    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Approve or Suspend user tier
exports.activateUserPrivateTier = async (req, res) => {
  try {
    const { targetUserId, customMtnPrice, discountPerGb, action = "APPROVE" } = req.body;

    if (action === "APPROVE") {
      const activated = await prisma.privateTierWhitelist.update({
        where: { userId: targetUserId },
        data: {
          isActive: true,
          status: "APPROVED",
          activatedAt: new Date(),
          approvedBy: req.user?.email || "SuperAdmin",
          customMtnPrice: customMtnPrice ? Number(customMtnPrice) : null,
          discountPerGb: discountPerGb ? Number(discountPerGb) : 30.0,
        },
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

      return res.status(200).json({
        success: true,
        message: "User private tier suspended.",
        data: suspended,
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. SuperAdmin Direct Terminal Activation
exports.directAdminActivate = async (req, res) => {
  try {
    const { apiKey, customMtnPrice, discountPerGb, note } = req.body;

    if (!apiKey) {
      return res.status(400).json({ success: false, message: "API Key or Customer Email is required." });
    }

    const cleanInput = apiKey.trim();
    let targetUserId = null;
    let targetEmail = null;

    // A. Direct Email Search (SuperAdmin can paste user email directly)
    if (cleanInput.includes("@")) {
      const userRecord = await prisma.user.findUnique({
        where: { email: cleanInput.toLowerCase() },
      });
      if (userRecord) {
        targetUserId = userRecord.id;
        targetEmail = userRecord.email;
      }
    }

    // B. Plain Text and SHA-256 Hash Matching
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
        console.warn("ApiKey lookup fallback triggered:", err.message);
      }
    }

    // C. User Table Relation Search
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

    // D. Direct Raw SQL Fallback (In case of table/column casing differences)
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
        message: `Account not found for (${cleanInput.slice(0, 16)}...). You can paste the customer's registered email directly into this input field to activate them instantly.`,
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
        customMtnPrice: customMtnPrice ? Number(customMtnPrice) : null,
        discountPerGb: discountPerGb ? Number(discountPerGb) : 30.0,
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
        customMtnPrice: customMtnPrice ? Number(customMtnPrice) : null,
        discountPerGb: discountPerGb ? Number(discountPerGb) : 30.0,
        note: note || "Manual SuperAdmin activation",
      },
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