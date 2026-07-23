const express = require("express");

const router = express.Router();

const auth = require(
  "../../middlewares/auth.middleware"
);

const {
  getDeveloperStatistics,
  getDeveloperUsageHistory,
  getDeveloperUsageById,
} = require(
  "./api-usage.controller"
);

/* ======================================================
   AUTHENTICATION

   CUSTOMER, ADMIN da SUPER_ADMIN duk za su iya shiga,
   amma controller yana dawo da usage na user ɗin da
   yake login ne kawai.
====================================================== */

router.use(auth);

/* ======================================================
   DEVELOPER STATISTICS

   Mun bar aliases da yawa domin tsoffin frontend pages
   da sabon frontend duka su yi aiki.
====================================================== */

router.get(
  "/",
  getDeveloperStatistics
);

router.get(
  "/dashboard",
  getDeveloperStatistics
);

router.get(
  "/statistics",
  getDeveloperStatistics
);

router.get(
  "/stats",
  getDeveloperStatistics
);

/* ======================================================
   DEVELOPER REQUEST HISTORY
====================================================== */

router.get(
  "/history",
  getDeveloperUsageHistory
);

router.get(
  "/requests",
  getDeveloperUsageHistory
);

/* ======================================================
   SINGLE USAGE RECORD

   Wannan ya kasance a ƙarshe domin kada ":id"
   ya kama "stats", "history" ko "dashboard".
====================================================== */

router.get(
  "/:id",
  getDeveloperUsageById
);

module.exports = router;