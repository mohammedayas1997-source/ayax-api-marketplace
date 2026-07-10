const prisma = require("../config/prisma");

exports.createProfile = async (req, res) => {
  try {
    const data = req.body;

    const profile = await prisma.networkProfile.create({
      data: {
        network: String(data.network).toUpperCase(),
        displayName: data.displayName,
        country: data.country || "NG",
        enabled: data.enabled ?? true,
        defaultSimSlot: Number(data.defaultSimSlot || 0),
        balanceUssd: data.balanceUssd || null,
        dataBalanceUssd: data.dataBalanceUssd || null,
        airtimeTemplate: data.airtimeTemplate || null,
        dataTemplate: data.dataTemplate || null,
        rechargeTemplate: data.rechargeTemplate || null,
        notes: data.notes || null,
      },
    });

    return res.status(201).json({ success: true, profile });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getProfiles = async (req, res) => {
  try {
    const profiles = await prisma.networkProfile.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, profiles });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const profile = await prisma.networkProfile.update({
      where: { id },
      data: {
        network: data.network ? String(data.network).toUpperCase() : undefined,
        displayName: data.displayName,
        country: data.country,
        enabled: data.enabled,
        defaultSimSlot:
          data.defaultSimSlot !== undefined ? Number(data.defaultSimSlot) : undefined,
        balanceUssd: data.balanceUssd,
        dataBalanceUssd: data.dataBalanceUssd,
        airtimeTemplate: data.airtimeTemplate,
        dataTemplate: data.dataTemplate,
        rechargeTemplate: data.rechargeTemplate,
        notes: data.notes,
      },
    });

    return res.json({ success: true, profile });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    await prisma.networkProfile.delete({
      where: { id: req.params.id },
    });

    return res.json({ success: true, message: "Network profile deleted" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.seedDefaults = async (req, res) => {
  try {
    const defaults = [
      {
        network: "MTN",
        displayName: "MTN Nigeria",
        balanceUssd: "*310#",
        dataBalanceUssd: "*323#",
        airtimeTemplate: "*311*{phone}*{amount}#",
      },
      {
        network: "AIRTEL",
        displayName: "Airtel Nigeria",
        balanceUssd: "*310#",
        dataBalanceUssd: "*323#",
        airtimeTemplate: "*311*{phone}*{amount}#",
      },
      {
        network: "GLO",
        displayName: "Glo Nigeria",
        balanceUssd: "*310#",
        dataBalanceUssd: "*323#",
        airtimeTemplate: "*311*{phone}*{amount}#",
      },
      {
        network: "9MOBILE",
        displayName: "9mobile Nigeria",
        balanceUssd: "*310#",
        dataBalanceUssd: "*323#",
        airtimeTemplate: "*311*{phone}*{amount}#",
      },
    ];

    const saved = [];

    for (const item of defaults) {
      const profile = await prisma.networkProfile.upsert({
        where: { network: item.network },
        update: item,
        create: item,
      });

      saved.push(profile);
    }

    return res.json({ success: true, profiles: saved });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};