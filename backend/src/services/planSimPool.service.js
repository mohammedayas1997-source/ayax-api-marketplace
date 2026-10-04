/**
 * Plan SIM Pool & Routing Service (Updated with Exclusive Plan Binding & Availability Matrix)
 * Path: src/services/planSimPool.service.js
 */
const mongoose = require("mongoose");
const mymtnGateway = require("./mymtn.gateway");

class PlanSimPoolService {
  /**
   * 1. Hada ko Kara SIMs a Karkashin Wani Plan ID
   * @param {string} developerId - ID na developer
   * @param {string} planId - Ainihin Plan ID (misali: mtn-tr-1gb-7days)
   * @param {Array<string>} simPhones - Jerin lambobin SIM da aka zaba
   * @param {string} action - 'ADD', 'REPLACE', ko 'REMOVE'
   */
  async assignSimsToPlan({ developerId, planId, simPhones = [], action = "ADD" }) {
    const db = mongoose.connection?.db;
    if (!db) throw new Error("Database connection offline");

    const cleanPlanId = String(planId).trim();
    const cleanPhones = simPhones.map((p) => String(p).replace(/\D/g, "")).filter(Boolean);

    // Idan REPLACE ko ADD ne, cire wadannan lambobin daga duk wani tsohon plan pool don kar su hadu a wuri biyu
    if (action === "ADD" || action === "REPLACE") {
      await db.collection("plan_sim_pools").updateMany(
        { developerId: String(developerId), planId: { $ne: cleanPlanId } },
        { $pull: { assignedSims: { $in: cleanPhones } } }
      );
    }

    const existingPool = await db.collection("plan_sim_pools").findOne({
      developerId: String(developerId),
      planId: cleanPlanId,
    });

    let currentSimList = existingPool?.assignedSims || [];

    if (action === "ADD") {
      const mergedSet = new Set([...currentSimList, ...cleanPhones]);
      currentSimList = Array.from(mergedSet);
    } else if (action === "REMOVE") {
      currentSimList = currentSimList.filter((p) => !cleanPhones.includes(p));
    } else if (action === "REPLACE") {
      currentSimList = cleanPhones;
    }

    const poolDoc = {
      developerId: String(developerId),
      planId: cleanPlanId,
      assignedSims: currentSimList,
      totalSimsCount: currentSimList.length,
      isActive: currentSimList.length > 0,
      isOutOfStock: false,
      lastRotatedIndex: existingPool?.lastRotatedIndex || 0,
      updatedAt: new Date(),
    };

    await db.collection("plan_sim_pools").updateOne(
      { developerId: String(developerId), planId: cleanPlanId },
      { $set: poolDoc, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    return {
      success: true,
      message: `An yi nasarar saita SIM guda ${currentSimList.length} na musamman don Plan [${cleanPlanId}]!`,
      planId: cleanPlanId,
      totalAssigned: currentSimList.length,
      sims: currentSimList,
    };
  }

  /**
   * 2. Dauko Katinan SIM Tare Da Matsayin Samuwarsu (Available SIMs vs Assigned Plans)
   * Wannan shine zai ware wa developer SIMs din da ke kyauta (Available) da kuma wanda aka riga aka saita a wani plan
   */
  async getSimAvailabilityMatrix(developerId, targetPlanId = null) {
    const db = mongoose.connection?.db;
    if (!db) return [];

    // Dauko dukkan SIMs din da developer ya hada
    const allSims = await db.collection("gatewaysims").find({}).sort({ updatedAt: -1 }).toArray();

    // Dauko dukkan pools din da aka riga aka yiwa saiti
    const allPools = await db
      .collection("plan_sim_pools")
      .find({ developerId: String(developerId) })
      .toArray();

    // Taswirar wane SIM ne ke karkashin wane Plan
    const simPlanMap = {};
    for (const pool of allPools) {
      if (Array.isArray(pool.assignedSims)) {
        for (const phone of pool.assignedSims) {
          simPlanMap[phone] = pool.planId;
        }
      }
    }

    return allSims.map((sim) => {
      const assignedTo = simPlanMap[sim.phone] || null;
      const isAssignedToThisPlan = targetPlanId && assignedTo === String(targetPlanId).trim();
      const isAvailable = !assignedTo || isAssignedToThisPlan;

      return {
        phone: sim.phone,
        airtimeBalance: sim.airtimeBalance || "NGN 0.00",
        dataBalance: sim.dataBalance || "0.00GB",
        tariff: sim.tariff || "MTN X",
        status: sim.status || "ACTIVE",
        assignedPlanId: assignedTo,
        isAvailableForTarget: Boolean(isAvailable),
        isCurrentPlanPool: Boolean(isAssignedToThisPlan),
        syncId: sim.simId || null,
      };
    });
  }

  /**
   * 3. Zabo SIM mai Data a Cikin Pool Din Wannan Plan Din (Round-Robin & Stock Check)
   */
  async getNextAvailableSimForPlan(planId, developerId = null) {
    const db = mongoose.connection?.db;
    if (!db) return null;

    const query = { planId: String(planId).trim() };
    if (developerId) query.developerId = String(developerId);

    const pool = await db.collection("plan_sim_pools").findOne(query);

    if (!pool || !pool.assignedSims || pool.assignedSims.length === 0) {
      return {
        available: false,
        reason: "NO_SIMS_ASSIGNED",
        message: `Babu katin SIM da aka ware wa wannan plan din [${planId}].`,
      };
    }

    const onlineSims = await db
      .collection("gatewaysims")
      .find({
        phone: { $in: pool.assignedSims },
        status: "ACTIVE",
      })
      .toArray();

    if (!onlineSims || onlineSims.length === 0) {
      await db.collection("plan_sim_pools").updateOne(
        { _id: pool._id },
        { $set: { isOutOfStock: true, stockReason: "Dukkan katinan SIM da aka ware sun kare ko suna offline." } }
      );

      return {
        available: false,
        reason: "OUT_OF_STOCK",
        message: `Plan [${planId}] ya kare (Out of Stock). Dukkan SIMs ${pool.assignedSims.length} da aka ware sun cinye datarsu.`,
      };
    }

    const nextIdx = ((pool.lastRotatedIndex || 0) + 1) % onlineSims.length;
    const selectedSim = onlineSims[nextIdx];

    await db.collection("plan_sim_pools").updateOne(
      { _id: pool._id },
      { $set: { lastRotatedIndex: nextIdx, isOutOfStock: false } }
    );

    return {
      available: true,
      sim: selectedSim,
      poolSize: onlineSims.length,
    };
  }
}

module.exports = new PlanSimPoolService();