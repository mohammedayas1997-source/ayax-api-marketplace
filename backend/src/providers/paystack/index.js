const paystackService = require("./service");
const { generatePaystackReference } = require("./utils");

module.exports = {
  ...paystackService,
  generatePaystackReference,
};