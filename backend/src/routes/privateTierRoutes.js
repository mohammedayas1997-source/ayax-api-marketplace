const express = require("express");
const router = express.Router();
const controller = require("../controllers/privateTier.controller");

// Yi amfani da auth middlewares dinka na asali
const { authenticateToken, authorizeAdmin } = require("../middleware/authMiddleware");

// Route 1: User Request (Kowa zai iya turawa idan yana da login)
router.post("/request-activation", authenticateToken, controller.submitForPrivateActivation);

// Route 2: Admin Dubawa (SuperAdmin/Admin kadai ke iya gani)
router.get("/admin/requests", authenticateToken, authorizeAdmin, controller.getPendingActivations);

// Route 3: Admin Kunna Masa (Activate/Approve)
router.post("/admin/activate", authenticateToken, authorizeAdmin, controller.activateUserPrivateTier);

module.exports = router;