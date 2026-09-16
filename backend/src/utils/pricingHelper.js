const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.calculateEffectivePrice = async (userId, apiKey, standardPrice, planType = "DATA") => {
  try {
    // Duba ko wannan mutumin yana cikin teburin sirri kuma an yi masa activating
    const privateProfile = await prisma.privateTierWhitelist.findFirst({
      where: {
        userId: userId,
        apiKey: apiKey,
        isActive: true,
        status: "APPROVED",
      },
    });

    // Idan yana ciki kuma an kunna masa:
    if (privateProfile) {
      if (planType === "DATA") {
        // Idan an saita masa tsayayyen farashi (misali N220 kacal)
        if (privateProfile.customMtnPrice) {
          return privateProfile.customMtnPrice;
        }
        // Ko kuma ragi na musamman
        return Math.max(standardPrice - privateProfile.discountPerGb, 0);
      }
    }

    // Idan ba ya cikin tsarin sirri, biya asalin farashin kowa da kowa:
    return standardPrice;
  } catch (e) {
    return standardPrice;
  }
};