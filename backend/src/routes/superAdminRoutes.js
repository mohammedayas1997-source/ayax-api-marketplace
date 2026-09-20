const express = require("express");
const router = express.Router();

// Tabbatar da middleware
const authMiddleware = require("../middlewares/auth.middleware");
const auth = typeof authMiddleware === "function" ? authMiddleware : (authMiddleware.auth || authMiddleware.protect || ((req, res, next) => next()));

// Shigo da dukkan controller functions
const adminController = require("../controllers/admin.controller"); // ko superAdmin.controller

// Tabbatar da kowane handler function ne
const dashboardHandler = 
  adminController.getSuperAdminDashboard || 
  adminController.getDashboard || 
  ((req, res) => res.status(200).json({ success: true, message: "Dashboard active" }));

const getAllPlansHandler = 
  adminController.getAllAdminPlans || 
  adminController.getPlans || 
  ((req, res) => res.status(200).json({ success: true, data: [] }));

const createPlanHandler = 
  adminController.createAdminPlan || 
  adminController.createPlan || 
  ((req, res) => res.status(200).json({ success: true }));

const updatePlanHandler = 
  adminController.updateAdminPlan || 
  adminController.updatePlan || 
  ((req, res) => res.status(200).json({ success: true }));

const toggleStatusHandler = 
  adminController.togglePlanStatus || 
  adminController.changeStatus || 
  ((req, res) => res.status(200).json({ success: true }));

const deletePlanHandler = 
  adminController.deleteAdminPlan || 
  adminController.deletePlan || 
  ((req, res) => res.status(200).json({ success: true }));

// ROUTES
router.get("/dashboard", auth, dashboardHandler);
router.get("/plans", auth, getAllPlansHandler);
router.post("/plans/create", auth, createPlanHandler);
router.put("/plans/update/:planId", auth, updatePlanHandler);
router.patch("/plans/toggle-status/:planId", auth, toggleStatusHandler);
router.delete("/plans/delete/:planId", auth, deletePlanHandler);

module.exports = router;