const express = require("express");

const router =
  express.Router();

const {
  validateChat,
} = require("./ai.validator");

const {
  chat,
} = require("./ai.controller");

/*
======================================================
PUBLIC AI ASSISTANT
======================================================
*/

router.post(
  "/chat",
  validateChat,
  chat
);

module.exports = router;