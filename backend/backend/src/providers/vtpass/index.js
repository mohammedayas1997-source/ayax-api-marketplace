const vtpassService = require("./service");
const { generateVtpassReference } = require("./utils");

module.exports = {
  ...vtpassService,
  generateVtpassReference,
};