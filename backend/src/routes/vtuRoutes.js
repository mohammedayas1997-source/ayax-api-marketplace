const express = require("express");
const router = express.Router();
const ayaxVtu = require("../controllers/ayaxVtu.controller");
const authMiddleware = require("../middlewares/authMiddleware"); // Tabbatar da middleware dinka

// Dukkan hanyoyin VTU ta amfani da Ayax APIs
router.post("/buy-data", authMiddleware, ayaxVtu.buyData);
router.post("/buy-airtime", authMiddleware, ayaxVtu.buyAirtime);
router.post("/pay-electricity", authMiddleware, ayaxVtu.payElectricity);
router.post("/pay-cable", authMiddleware, ayaxVtu.payCableTV);

module.exports = router;