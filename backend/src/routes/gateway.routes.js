const router = require("express").Router();

const {
  pairDevice,
  heartbeat,
  receiveCommandResult,
  getDevices,
  disconnectDevice,
  deleteDevice,
  renameDevice,
  getIncomingSms,
  receiveIncomingSms,
  refreshSimBalance,
  updateLocation,
  syncSims,
  getGatewayDevices,
  getDeviceSims,
  receiveSecurityAlert,
  getSecurityAlerts,
  resolveSecurityAlert,
  lockGatewayDevice,
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
router.get("/incoming-sms", getIncomingSms);
router.delete("/devices/:id", deleteDevice);
router.post("/incoming-sms", receiveIncomingSms);
router.post("/sims/sync", syncSims);
router.get("/devices", getGatewayDevices);
router.post("/location", updateLocation);
router.post("/sims/refresh-balance", refreshSimBalance);
router.get("/devices/:deviceId/sims", getDeviceSims);
router.post("/security-alert", receiveSecurityAlert);
router.get("/security-alerts", getSecurityAlerts);
router.post("/alarm/start", startDeviceAlarm);
router.post("/lock-device", lockGatewayDevice);

router.post("/alarm/stop", stopDeviceAlarm);
router.patch("/security-alerts/:id/resolve", resolveSecurityAlert);
// =========================
// Pair Codes
// =========================
router.post("/pair-code/generate", generatePairCode);
router.get("/pair-code", getPairCodes);

module.exports = router;