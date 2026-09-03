const router = require("express").Router();
const identityController = require("../controllers/identity.controller");
const auth = require("../middlewares/auth.middleware");

// Routes don NIN da BVN
router.post("/nin/verify", auth, identityController.verifyNin);
router.post("/bvn/verify", auth, identityController.verifyBvn);
router.post("/nin/validate", auth, identityController.validateNinIssue);

module.exports = router;