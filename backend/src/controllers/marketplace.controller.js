const prisma = require("../config/prisma");
const crypto = require("crypto");
const { emitEvent } = require("../config/socket");
const { findBestDevice } = require("../services/deviceRouter.service");
const {
  getNetworkProfile,
  buildTemplate,
} = require("../services/networkProfile.service");

exports.buyAirtime = async (req, res) => {
  try {
    const userId = req.user.id;
    const { network, phone, amount } = req.body;

    if (!network || !phone || !amount) {
      return res.status(400).json({
        success: false,
        message: "Network, phone and amount are required",
      });
    }

    const value = Number(amount);

    if (isNaN(value) || value < 50) {
      return res.status(400).json({
        success: false,
        message: "Minimum airtime amount is ₦50",
      });
    }

    const profile = await getNetworkProfile(network);

    const ussdCode = buildTemplate(profile.airtimeTemplate, {
      phone,
      amount: value,
    });

    const { device, sim } = await findBestDevice({
      network,
      service: "AIRTIME",
    });

    const simSlot = sim.slotIndex;

    const reference =
      "AIRTIME-" + crypto.randomBytes(8).toString("hex").toUpperCase();

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) throw new Error("Wallet not found");
      if (wallet.balance < value) throw new Error("Insufficient wallet balance");

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - value;

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          reference,
          type: "DEBIT",
          amount: value,
          status: "PROCESSING",
          service: "AIRTIME",
          description: `${network} airtime purchase for ${phone}`,
        },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          reference,
          type: "DEBIT",
          amount: value,
          balanceBefore,
          balanceAfter,
          module: "AIRTIME",
          description: `${network} airtime purchase for ${phone}`,
        },
      });

      const command = await tx.gsmCommand.create({
        data: {
          reference,
          deviceId: device.id,
          type: "USSD",
          status: "PENDING",
          payload: {
            network,
            phone,
            amount: value,
            simSlot,
            ussdCode,
            simId: sim.id,
          },
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
        command,
      };
    });

    emitEvent("wallet-updated", {
      userId,
      wallet: result.wallet,
    });

    emitEvent(
      "gateway-command",
      {
        reference,
        type: "USSD",
        simSlot,
        ussdCode,
      },
      device.id
    );

    return res.status(201).json({
      success: true,
      message: "Airtime purchase sent to GSM Gateway",
      transaction: result.transaction,
      command: result.command,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get all available Networks & Plans for API Developers
 * @route   GET /api/v1/marketplace/plans
 * @access  Public / Developer
 */
exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.dataPlan.findMany({
      where: { isActive: true },
      select: {
        planId: true,
        networkId: true,
        network: true,
        name: true,
        volume: true,
        type: true,
        validity: true,
        apiPrice: true,
      },
      orderBy: { planId: "asc" },
    });

    const networks = [
      { id: "1", name: "MTN" },
      { id: "2", name: "AIRTEL" },
      { id: "3", name: "9MOBILE" },
      { id: "4", name: "GLO" },
    ];

    return res.status(200).json({
      success: true,
      status: "success",
      message: "Marketplace plans retrieved successfully",
      data: {
        networks,
        plans,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plans: " + error.message,
    });
  }
};

/**
 * @desc    Buy Data via Plan ID (Marketplace API Consumer or User)
 * @route   POST /api/v1/marketplace/data/buy
 * @access  Private (Bearer Token / API Key)
 */
exports.buyData = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { network_id, plan_id, phone, ref_id } = req.body;

    if (!network_id || !plan_id || !phone) {
      return res.status(400).json({
        success: false,
        message: "network_id, plan_id and phone are required",
      });
    }

    const cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length < 11) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    // 1. Nemo ainihin Plan din da aka turo
    const selectedPlan = await prisma.dataPlan.findUnique({
      where: { planId: String(plan_id) },
    });

    if (!selectedPlan || !selectedPlan.isActive) {
      return res.status(404).json({
        success: false,
        message: `Plan ID '${plan_id}' is invalid or currently unavailable`,
      });
    }

    if (String(selectedPlan.networkId) !== String(network_id)) {
      return res.status(400).json({
        success: false,
        message: `Network ID mismatch for Plan ${selectedPlan.name}`,
      });
    }

    const value = Number(selectedPlan.apiPrice);
    const network = selectedPlan.network;
    const reference = ref_id || "DATA-" + crypto.randomBytes(8).toString("hex").toUpperCase();

    // 2. Gudanar da GSM Router Setup ko USSD Template
    let ussdCode = "";
    let device = null;
    let sim = null;
    let simSlot = 0;

    try {
      const profile = await getNetworkProfile(network);
      ussdCode = buildTemplate(selectedPlan.ussdCode || profile.dataTemplate, {
        phone: cleanPhone,
        volume: selectedPlan.volume,
        amount: value,
      });

      const routeData = await findBestDevice({
        network,
        service: "DATA",
      });

      device = routeData.device;
      sim = routeData.sim;
      simSlot = sim.slotIndex;
    } catch (routeErr) {
      console.warn("GSM Device router notice:", routeErr.message);
    }

    // 3. Prisma Atomic Transaction
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) throw new Error("Wallet not found");
      if (wallet.balance < value) throw new Error(`Insufficient wallet balance. Required: ₦${value}`);

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - value;

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          reference,
          type: "DEBIT",
          amount: value,
          status: "PROCESSING",
          service: "DATA",
          description: `${selectedPlan.name} purchase for ${cleanPhone}`,
        },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          reference,
          type: "DEBIT",
          amount: value,
          balanceBefore,
          balanceAfter,
          module: "DATA",
          description: `${selectedPlan.name} purchase for ${cleanPhone}`,
        },
      });

      let command = null;
      if (device && sim) {
        command = await tx.gsmCommand.create({
          data: {
            reference,
            deviceId: device.id,
            type: "USSD",
            status: "PENDING",
            payload: {
              network,
              phone: cleanPhone,
              planId: selectedPlan.planId,
              planName: selectedPlan.name,
              amount: value,
              simSlot,
              ussdCode,
              simId: sim.id,
            },
          },
        });
      }

      return {
        wallet: updatedWallet,
        transaction,
        command,
      };
    });

    emitEvent("wallet-updated", {
      userId,
      wallet: result.wallet,
    });

    if (device && sim) {
      emitEvent(
        "gateway-command",
        {
          reference,
          type: "USSD",
          simSlot,
          ussdCode,
        },
        device.id
      );
    }

    return res.status(201).json({
      success: true,
      status: "success",
      message: `${selectedPlan.name} queued successfully for ${cleanPhone}`,
      data: {
        reference,
        network,
        network_id,
        plan_id,
        plan_name: selectedPlan.name,
        amount: value,
        phone: cleanPhone,
        status: "PROCESSING",
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};