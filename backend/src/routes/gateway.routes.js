const router = require("express").Router();

const {
  pairDevice,
  heartbeat,
  receiveCommandResult,
  getDevices,
  disconnectDevice,
  deleteDevice,
  renameDevice,
} = require("../controllers/gateway.controller");

const {
  generatePairCode,
  getPairCodes,
} = require("../controllers/pairCode.controller");

// =========================
// Gateway Device
// =========================
router.post("/pair", pairDevice);
router.post("/heartbeat", heartbeat);
router.post("/result", receiveCommandResult);


router.get("/devices", getDevices);

router.patch("/devices/:id/rename", renameDevice);

router.patch("/devices/:id/disconnect", disconnectDevice);

router.delete("/devices/:id", deleteDevice);
// =========================
// Pair Codes
// =========================
router.post("/pair-code/generate", generatePairCode);
router.get("/pair-code", getPairCodes);

module.exports = router;