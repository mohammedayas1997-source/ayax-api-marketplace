const router = require("express").Router();

const {
  sendSmsCommand,
  sendUssdCommand,
  getCommands,
} = require("../controllers/command.controller");

router.post("/sms", sendSmsCommand);
router.post("/ussd", sendUssdCommand);
router.get("/", getCommands);

module.exports = router;