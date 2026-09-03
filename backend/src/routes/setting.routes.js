const router = require("express").Router();
const settingController = require("../controllers/setting.controller");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

router.get("/tier-fees", settingController.getTierFees);
router.post(
  "/tier-fees",
  auth,
  role("SUPER_ADMIN"),
  settingController.updateTierFees
);

module.exports = router;