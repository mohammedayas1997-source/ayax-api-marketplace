const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");
const mongoose = require("mongoose");
const planSimPoolService = require("../services/planSimPool.service");
const mymtnGateway = require("../services/mymtn.gateway");

// Idan createAuditLog yana wani file,
// ka gyara path din import din nan.
const { createAuditLog } = require("../utils/auditLog");

/**
 * GET ALL FUNDING REQUESTS
 */
exports.getFundingRequests = async (req, res) => {
  try {
    const requests = await prisma.fundingRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get funding requests error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load funding requests.",
    });
  }
};

/**
 * APPROVE FUNDING REQUEST
 */
exports.approveFunding = async (req, res) => {
  try {
    const { fundingId } = req.params;

    const funding = await prisma.fundingRequest.findUnique({
      where: {
        id: fundingId,
      },
      include: {
        user: true,
      },
    });

    if (!funding) {
      return res.status(404).json({
        success: false,
        message: "Funding request not found.",
      });
    }

    if (funding.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Funding request has already been processed.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentWallet = await tx.wallet.findUnique({
        where: {
          userId: funding.userId,
        },
      });

      let wallet;

      if (currentWallet) {
        wallet = await tx.wallet.update({
          where: {
            userId: funding.userId,
          },
          data: {
            balance: {
              increment: funding.amount,
            },
          },
        });
      } else {
        wallet = await tx.wallet.create({
          data: {
            userId: funding.userId,
            balance: funding.amount,
          },
        });
      }

      const updatedFunding = await tx.fundingRequest.update({
        where: {
          id: funding.id,
        },
        data: {
          status: "APPROVED",
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference: funding.reference,
          userId: funding.userId,
          type: "CREDIT",
          service: "WALLET_FUNDING",
          amount: funding.amount,
          status: "SUCCESSFUL",
          description: "Wallet funding approved by admin.",
        },
      });

      return {
        wallet,
        updatedFunding,
        transaction,
      };
    });

    if (typeof createAuditLog === "function") {
      await createAuditLog({
        user: req.user,
        action: "APPROVE_FUNDING",
        module: "WALLET",
        description: `Funding request ${funding.reference} approved.`,
        ip: req.ip,
      });
    }

    emitEvent("funding-approved", {
      message: "Funding approved.",
      result,
    });

    emitEvent("wallet-updated", {
      userId: funding.userId,
      wallet: result.wallet,
    });

    emitEvent("transaction-updated", {
      transaction: result.transaction,
    });

    return res.json({
      success: true,
      message: "Wallet funded successfully.",
      result,
    });
  } catch (error) {
    console.error("Approve funding error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Funding approval failed.",
    });
  }
};

/**
 * REJECT FUNDING REQUEST
 */
exports.rejectFunding = async (req, res) => {
  try {
    const { fundingId } = req.params;

    const funding = await prisma.fundingRequest.findUnique({
      where: {
        id: fundingId,
      },
      include: {
        user: true,
      },
    });

    if (!funding) {
      return res.status(404).json({
        success: false,
        message: "Funding request not found.",
      });
    }

    if (funding.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Funding request has already been processed.",
      });
    }

    const updatedFunding = await prisma.fundingRequest.update({
      where: {
        id: fundingId,
      },
      data: {
        status: "REJECTED",
      },
    });

    if (typeof createAuditLog === "function") {
      await createAuditLog({
        user: req.user,
        action: "REJECT_FUNDING",
        module: "WALLET",
        description: `Funding request ${funding.reference} rejected.`,
        ip: req.ip,
      });
    }

    emitEvent("funding-rejected", {
      message: "Funding rejected.",
      funding: updatedFunding,
    });

    return res.json({
      success: true,
      message: "Funding request rejected.",
      funding: updatedFunding,
    });
  } catch (error) {
    console.error("Reject funding error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Funding rejection failed.",
    });
  }
};

/**
 * CHANGE USER ROLE
 */
exports.changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const allowedRoles = [
      "SUPER_ADMIN",
      "ADMIN",
      "STAFF_ADMIN",
      "CUSTOMER_SERVICE",
      "CUSTOMER",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    if (typeof createAuditLog === "function") {
      await createAuditLog({
        user: req.user,
        action: "CHANGE_USER_ROLE",
        module: "USERS",
        description: `User ${user.email} role changed from ${existingUser.role} to ${role}.`,
        ip: req.ip,
      });
    }

    emitEvent("user-role-updated", {
      message: "User role updated.",
      user,
    });

    return res.json({
      success: true,
      message: "User role changed successfully.",
      user,
    });
  } catch (error) {
    console.error("Change user role error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to change user role.",
    });
  }
};

// =========================================================================
// API MARKETPLACE ADMIN MASTER SIM POOL ORCHESTRATION
// =========================================================================

/**
 * ADMIN: Saita ko Kara SIMs a Master Pool na API Marketplace
 * POST /api/v1/admin/gateway/plan-pool/assign
 */
exports.assignMarketplaceSimsToPlan = async (req, res) => {
  try {
    const { planId, simPhones, action } = req.body;
    const adminId = "admin_master"; // Master Developer ID na API Marketplace

    if (!planId || !Array.isArray(simPhones)) {
      return res.status(400).json({
        success: false,
        message: "planId and an array of simPhones are required.",
      });
    }

    const result = await planSimPoolService.assignSimsToPlan({
      developerId: adminId,
      planId,
      simPhones,
      action: action || "ADD",
    });

    if (typeof createAuditLog === "function") {
      await createAuditLog({
        user: req.user,
        action: "UPDATE_MASTER_SIM_POOL",
        module: "GATEWAY",
        description: `Admin updated master SIM pool for plan [${planId}] with ${simPhones.length} SIM(s).`,
        ip: req.ip,
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ADMIN: Dauko Jerin Dukkan SIMs Tare da Available Status & Balances
 * GET /api/v1/admin/gateway/plan-pool/availability
 */
exports.getMarketplaceSimAvailability = async (req, res) => {
  try {
    const { planId } = req.query;
    const matrix = await planSimPoolService.getSimAvailabilityMatrix("admin_master", planId);

    return res.status(200).json({
      success: true,
      count: matrix.length,
      sims: matrix,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ADMIN: Dauko dukkan Master Pools da aka saita
 * GET /api/v1/admin/gateway/plan-pool/pools
 */
exports.getMarketplacePools = async (req, res) => {
  try {
    const db = mongoose.connection?.db;
    if (!db) {
      return res.status(500).json({ success: false, message: "Database offline" });
    }

    const pools = await db
      .collection("plan_sim_pools")
      .find({ developerId: "admin_master" })
      .toArray();

    return res.status(200).json({
      success: true,
      count: pools.length,
      pools,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ADMIN: Sabunta Live Balances (Airtime & Data) kai-tsaye daga MyMTN
 * POST /api/v1/admin/gateway/refresh-balances
 */
exports.refreshAllMarketplaceBalances = async (req, res) => {
  try {
    const db = mongoose.connection?.db;
    if (!db) return res.status(500).json({ success: false, message: "Database offline" });

    const sims = await db.collection("gatewaysims").find({ status: "ACTIVE" }).toArray();
    let updatedCount = 0;

    for (const sim of sims) {
      if (sim.token && typeof mymtnGateway.fetchSimBalances === "function") {
        try {
          const balances = await mymtnGateway.fetchSimBalances(sim.token, sim.phone);
          await db.collection("gatewaysims").updateOne(
            { _id: sim._id },
            {
              $set: {
                airtimeBalance: balances.airtime,
                dataBalance: balances.data,
                tariff: balances.tariff || "MTN X",
                lastSync: new Date(),
              },
            }
          );
          updatedCount++;
        } catch (_) {}
      }
    }

    return res.status(200).json({
      success: true,
      message: `Refreshed live balances for ${updatedCount} SIM cards successfully!`,
      updatedCount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};