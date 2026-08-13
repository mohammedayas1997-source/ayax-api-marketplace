const monnifyService = require("./service");
const { generateMonnifyReference } = require("./utils");

module.exports = {
  ...monnifyService,
  generateMonnifyReference,
};