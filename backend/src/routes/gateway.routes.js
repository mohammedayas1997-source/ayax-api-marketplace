const router = require("express").Router();

const {
  pairDevice,
  heartbeat,
  receiveCommandResult,
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
  startDeviceAlarm,
  stopDeviceAlarm,
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

// Wannan ne kawai GET /devices
router.get("/devices", getGatewayDevices);

router.patch("/devices/:id/rename", renameDevice);
router.patch("/devices/:id/disconnect", disconnectDevice);
router.delete("/devices/:id", deleteDevice);

// =========================
// SIM Management
// =========================
router.post("/sims/sync", syncSims);
router.post("/sims/refresh-balance", refreshSimBalance);
router.get("/devices/:deviceId/sims", getDeviceSims);

// =========================
// Incoming SMS
// =========================
router.get("/incoming-sms", getIncomingSms);
router.post("/incoming-sms", receiveIncomingSms);

// =========================
// Location and Security
// =========================
router.post("/location", updateLocation);

router.post("/security-alert", receiveSecurityAlert);
router.get("/security-alerts", getSecurityAlerts);
router.patch("/security-alerts/:id/resolve", resolveSecurityAlert);

// =========================
// Remote Device Commands
// =========================
router.post("/alarm/start", startDeviceAlarm);
router.post("/alarm/stop", stopDeviceAlarm);
router.post("/lock-device", lockGatewayDevice);

// =========================
// Pair Codes
// =========================
router.post("/pair-code/generate", generatePairCode);
router.get("/pair-code", getPairCodes);

module.exports = router;