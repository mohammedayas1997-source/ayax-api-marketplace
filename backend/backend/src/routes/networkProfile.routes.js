const router = require("express").Router();

const {
  createProfile,
  getProfiles,
  updateProfile,
  deleteProfile,
  seedDefaults,
} = require("../controllers/networkProfile.controller");

router.get("/", getProfiles);
router.post("/", createProfile);
router.post("/seed-defaults", seedDefaults);
router.patch("/:id", updateProfile);
router.delete("/:id", deleteProfile);

module.exports = router;