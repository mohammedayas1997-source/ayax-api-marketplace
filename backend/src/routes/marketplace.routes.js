const router = require("express").Router();

const auth = require("../middlewares/auth.middleware");
const {
  buyAirtime,
  buyData,
  getPlans,
} = require("../controllers/marketplace.controller");

/* ======================================================
   1. PLANS CATALOG (PUBLIC / DEVELOPER ACCESS)
   Developers na iya kiran wannan domin samun dukkan 
   jerin Network IDs da Plan IDs don nunawa a manhajarsu
====================================================== */
router.get("/plans", getPlans);

/* ======================================================
   2. AIRTIME SERVICES
====================================================== */
router.post("/airtime/buy", auth, buyAirtime);
router.post("/airtime", auth, buyAirtime);

/* ======================================================
   3. DATA SERVICES (VIA NETWORK_ID & PLAN_ID)
====================================================== */
router.post("/data/buy", auth, buyData);
router.post("/data", auth, buyData);

module.exports = router;