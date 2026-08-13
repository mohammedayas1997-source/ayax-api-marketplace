const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  createTicket,
  getTickets,
  updateTicket,
} = require("../controllers/support.controller");

router.post(
  "/tickets",
  auth,
  createTicket
);

router.get(
  "/tickets",
  auth,
  role("ADMIN", "SUPER_ADMIN", "CUSTOMER_SERVICE"),
  getTickets
);

router.patch(
  "/tickets/:ticketId",
  auth,
  role("ADMIN", "SUPER_ADMIN", "CUSTOMER_SERVICE"),
  updateTicket
);

module.exports = router;