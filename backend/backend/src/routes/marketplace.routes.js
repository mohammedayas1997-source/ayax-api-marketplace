const router = require("express").Router();

const auth = require("../middlewares/auth.middleware");

const { buyAirtime } = require("../controllers/marketplace.controller");

router.post("/airtime/buy", auth, buyAirtime);

module.exports = router;