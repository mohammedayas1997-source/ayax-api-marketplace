const router =
  require("express").Router();

const auth = require(
  "../middlewares/auth.middleware"
);

const {
  sendSmsCommand,
  sendUssdCommand,
  getCommands,
  getUssdLogs,
} = require(
  "../controllers/command.controller"
);

/*
 * POST /api/v1/commands/sms
 */
router.post(
  "/sms",
  auth,
  sendSmsCommand
);

/*
 * POST /api/v1/commands/ussd
 */
router.post(
  "/ussd",
  auth,
  sendUssdCommand
);

/*
 * GET /api/v1/commands/ussd-logs
 */
router.get(
  "/ussd-logs",
  auth,
  getUssdLogs
);

/*
 * GET /api/v1/commands
 *
 * Wannan ya kasance a ƙasa domin
 * kada ya kama /ussd-logs.
 */
router.get(
  "/",
  auth,
  getCommands
);

module.exports = router;