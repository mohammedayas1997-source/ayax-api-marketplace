const termiiService = require("./service");
const { generateTermiiReference } = require("./utils");

module.exports = {
  ...termiiService,
  generateTermiiReference,
};