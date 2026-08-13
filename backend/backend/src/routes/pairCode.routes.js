const router = require("express").Router();

const {

generatePairCode,

getPairCodes

} = require("../controllers/pairCode.controller");

router.post("/generate",generatePairCode);

router.get("/",getPairCodes);

module.exports = router;