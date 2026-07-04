const prisma = require("../config/prisma");

// Get all plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.apiPlan.findMany({
      include: {
        provider: true,
        service: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      plans,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

// Create
exports.createPlan = async (req, res) => {
  try {
    const plan = await prisma.apiPlan.create({
      data: req.body,
    });

    res.status(201).json({
      success: true,
      plan,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

// Update
exports.updatePlan = async (req, res) => {
  try {
    const plan = await prisma.apiPlan.update({
      where: {
        id: req.params.id,
      },
      data: req.body,
    });

    res.json({
      success: true,
      plan,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

// Delete
exports.deletePlan = async (req, res) => {
  try {
    await prisma.apiPlan.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      success: true,
      message: "Plan deleted",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

// Change Status
exports.changeStatus = async (req, res) => {
  try {
    const plan = await prisma.apiPlan.update({
      where: {
        id: req.params.id,
      },
      data: {
        status: req.body.status,
      },
    });

    res.json({
      success: true,
      plan,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};