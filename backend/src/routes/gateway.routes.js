const express = require("express");
const router = express.Router();

const {
  pairDevice,
  heartbeat,
  receiveCommandResult,
  generatePairCode,
  disconnectDevice,
  deleteDevice,
  renameDevice,
  receiveIncomingSms,
  getIncomingSms,
  syncSims,
  getDeviceSims,
  refreshSimBalance,
  getGatewayDevices,
  updateLocation,
  receiveSecurityAlert,
  getSecurityAlerts,
  resolveSecurityAlert,
  startDeviceAlarm,
  stopDeviceAlarm,
  lockGatewayDevice,
} = require("../controllers/gateway.controller");

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

module.exports = router;