const router = require("express").Router();

const {
  getPartners,
  getPartner,
  createPartner,
  updatePartner,
  updatePartnerStatus,
  deletePartner,
} = require("../controllers/partner.controller");

const authMiddleware = require(
  "../middlewares/auth.middleware"
);

const authorize = require(
  "../middlewares/role.middleware"
);

router.use(authMiddleware);

router.get(
  "/",
  authorize(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  getPartners
);

router.get(
  "/:id",
  authorize(
    "SUPER_ADMIN",
    "ADMIN"
  ),
  getPartner
);

router.post(
  "/",
  authorize("SUPER_ADMIN"),
  createPartner
);

router.patch(
  "/:id",
  authorize("SUPER_ADMIN"),
  updatePartner
);

router.patch(
  "/:id/status",
  authorize("SUPER_ADMIN"),
  updatePartnerStatus
);

router.delete(
  "/:id",
  authorize("SUPER_ADMIN"),
  deletePartner
);

module.exports = router;