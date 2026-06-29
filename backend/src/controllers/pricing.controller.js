const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

exports.createPlan = async (req, res) => {
  try {
    const {
      serviceId,
      name,
      code,
      category,
      costPrice,
      sellingPrice,
      description,
      status,
    } = req.body;

    if (!serviceId || !name || !code || !category || costPrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: "serviceId, name, code, category, costPrice and sellingPrice are required",
      });
    }

    const plan = await prisma.apiPlan.create({
      data: {
        serviceId,
        name,
        code: String(code).toUpperCase(),
        category,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        description: description || null,
        status: status || "ACTIVE",
      },
      include: {
        service: {
          include: {
            provider: true,
          },
        },
      },
    });

    emitEvent("plan-created", {
      message: "New API plan created",
      plan,
    });

    return res.status(201).json({
      success: true,
      message: "API plan created successfully",
      plan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.apiPlan.findMany({
      include: {
        service: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      plans,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getActivePlans = async (req, res) => {
  try {
    const plans = await prisma.apiPlan.findMany({
      where: { status: "ACTIVE" },
      include: {
        service: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      plans,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const data = { ...req.body };

    if (data.code !== undefined) data.code = String(data.code).toUpperCase();
    if (data.costPrice !== undefined) data.costPrice = Number(data.costPrice);
    if (data.sellingPrice !== undefined) data.sellingPrice = Number(data.sellingPrice);

    const plan = await prisma.apiPlan.update({
      where: { id: planId },
      data,
      include: {
        service: {
          include: {
            provider: true,
          },
        },
      },
    });

    emitEvent("plan-updated", {
      message: "API plan updated",
      plan,
    });

    return res.json({
      success: true,
      message: "API plan updated successfully",
      plan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;

    await prisma.apiPlan.delete({
      where: { id: planId },
    });

    emitEvent("plan-deleted", {
      message: "API plan deleted",
      planId,
    });

    return res.json({
      success: true,
      message: "API plan deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.togglePlanStatus = async (req, res) => {
  try {
    const { planId } = req.params;

    const existing = await prisma.apiPlan.findUnique({
      where: { id: planId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const plan = await prisma.apiPlan.update({
      where: { id: planId },
      data: {
        status: existing.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      },
    });

    emitEvent("plan-status-updated", {
      message: "Plan status updated",
      plan,
    });

    return res.json({
      success: true,
      message: "Plan status updated",
      plan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
