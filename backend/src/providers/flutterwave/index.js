const flutterwaveService = require("./service");
const { generateFlutterwaveReference } = require("./utils");

module.exports = {
  ...flutterwaveService,
  generateFlutterwaveReference,
};