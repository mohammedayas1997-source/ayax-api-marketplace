const router = require("express").Router();
const auth = require("../middlewares/auth.middleware"); // ko protect middleware
const adminController = require("../controllers/admin.controller");

// SuperAdmin Dashboard
router.get("/dashboard", auth, adminController.getSuperAdminDashboard);

// Plan & Network Management
router.get("/plans", auth, adminController.getAllAdminPlans);
router.post("/plans/create", auth, adminController.createAdminPlan);
router.put("/plans/update/:planId", auth, adminController.updateAdminPlan);
router.patch("/plans/toggle-status/:planId", auth, adminController.togglePlanStatus);
router.delete("/plans/delete/:planId", auth, adminController.deleteAdminPlan);

module.exports = router;