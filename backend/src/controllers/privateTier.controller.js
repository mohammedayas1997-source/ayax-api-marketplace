const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 1. User yana aika buƙatar shiga tsarin bayan fage tare da API Key ɗinsa
exports.submitForPrivateActivation = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { apiKey, note } = req.body;

    if (!apiKey) {
      return res.status(400).json({ success: false, message: "API Key is required" });
    }

    // Tabbatar da cewa API Key din na asalin wannan user din ne
    const verifiedKey = await prisma.apiKey.findFirst({
      where: { key: apiKey, userId: userId, status: "ACTIVE" },
      include: { user: true },
    });

    if (!verifiedKey) {
      return res.status(403).json({
        success: false,
        message: "Invalid API Key: This key does not belong to your account or is inactive.",
      });
    }

    // Ajiye buƙatar a teburin sirri
    const record = await prisma.privateTierWhitelist.upsert({
      where: { userId: userId },
      update: {
        apiKey: apiKey,
        userEmail: verifiedKey.user.email,
        status: "PENDING",
        isActive: false,
        note: note || "Custom rate requested",
      },
      create: {
        userId: userId,
        userEmail: verifiedKey.user.email,
        apiKey: apiKey,
        status: "PENDING",
        isActive: false,
        note: note || "Custom rate requested",
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

// 2. Admin yana duba dukkan masu neman tsarin sirri
exports.getPendingActivations = async (req, res) => {
  try {
    const pendingList = await prisma.privateTierWhitelist.findMany({
      orderBy: { requestedAt: "desc" },
    });

    return res.status(200).json({ success: true, count: pendingList.length, data: pendingList });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Admin yana kunna wa mutum (Activate) tare da sanya farashin da ake so
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
          approvedBy: req.user.email || "SuperAdmin",
          customMtnPrice: customMtnPrice ? Number(customMtnPrice) : null,
          discountPerGb: discountPerGb ? Number(discountPerGb) : 30.0,
        },
      });

      return res.status(200).json({
        success: true,
        message: `User [${activated.userEmail}] successfully activated on private secret tier!`,
        data: activated,
      });
    } else {
      // Reject ko Suspend
      const suspended = await prisma.privateTierWhitelist.update({
        where: { userId: targetUserId },
        data: {
          isActive: false,
          status: "SUSPENDED",
        },
      });

      return res.status(200).json({
        success: true,
        message: `User private tier suspended.`,
        data: suspended,
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
exports.directAdminActivate = async (req, res) => {
  try {
    const { apiKey, customMtnPrice, discountPerGb, note } = req.body;

    if (!apiKey) {
      return res.status(400).json({ success: false, message: "API Key is required" });
    }

    const cleanKey = apiKey.trim();
    let targetUserId = null;
    let targetEmail = null;

    // 1. Check in ApiKey table
    try {
      if (prisma.apiKey) {
        const keyRecord = await prisma.apiKey.findFirst({
          where: {
            OR: [
              { key: cleanKey },
              { apiKey: cleanKey },
              ...(prisma.apiKey.fields?.token ? [{ token: cleanKey }] : []),
            ],
          },
          include: { user: true },
        });

        if (keyRecord) {
          targetUserId = keyRecord.userId || keyRecord.user?.id;
          targetEmail = keyRecord.user?.email || keyRecord.email;
        }
      }
    } catch (e) {
      console.warn("ApiKey table lookup fallback:", e.message);
    }

    // 2. Check directly in User table
    if (!targetUserId) {
      const userRecord = await prisma.user.findFirst({
        where: {
          OR: [
            { apiKey: cleanKey },
            ...(prisma.user.fields?.liveApiKey ? [{ liveApiKey: cleanKey }] : []),
            ...(prisma.user.fields?.secretKey ? [{ secretKey: cleanKey }] : []),
          ],
        },
      });

      if (userRecord) {
        targetUserId = userRecord.id;
        targetEmail = userRecord.email;
      }
    }

    // 3. Fallback: Search by email if key contains an email address
    if (!targetUserId && cleanKey.includes("@")) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: cleanKey },
      });
      if (userByEmail) {
        targetUserId = userByEmail.id;
        targetEmail = userByEmail.email;
      }
    }

    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: `No account matches this API Key (${cleanKey.slice(0, 12)}...). Verify that the customer has generated a live key on their dashboard.`,
      });
    }

    // 4. Activate or update whitelist record
    const activated = await prisma.privateTierWhitelist.upsert({
      where: { userId: targetUserId },
      update: {
        apiKey: cleanKey,
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
        apiKey: cleanKey,
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