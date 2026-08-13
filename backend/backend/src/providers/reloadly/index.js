const reloadlyService = require("./service");
const { generateReloadlyReference } = require("./utils");

module.exports = {
  ...reloadlyService,
  generateReloadlyReference,
};