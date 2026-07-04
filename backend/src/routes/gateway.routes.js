const router = require("express").Router();

const {
  pairDevice,
  heartbeat,
  receiveCommandResult,
} = require("../controllers/gateway.controller");

router.post("/pair", pairDevice);
router.post("/heartbeat", heartbeat);
router.post("/result", receiveCommandResult);

module.exports = router;