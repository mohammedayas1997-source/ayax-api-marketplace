const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

require("./config/env");

/* ======================================================
   ROUTES
====================================================== */

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const transactionRoutes = require(
  "./routes/transaction.routes"
);
const refundRoutes = require("./routes/refund.routes");
const supportRoutes = require("./routes/support.routes");
const pricingRoutes = require("./routes/pricing.routes");
const purchaseRoutes = require("./routes/purchase.routes");
const gsmRoutes = require("./routes/gsm.routes");
const auditRoutes = require("./routes/audit.routes");
const partnerRoutes = require("./routes/partner.routes");
const healthRoutes = require("./routes/health.routes");
const dataRoutes = require("./routes/data.routes");
const airtimeRoutes = require("./routes/airtime.routes");
const walletRoutes = require("./routes/wallet.routes");
const apiPlanRoutes = require("./routes/apiPlan.routes");
const notificationRoutes = require("./routes/notification.routes");
const marketplaceRoutes = require(
  "./routes/marketplace.routes"
);
const gatewayRoutes = require("./routes/gateway.routes");
const pairCodeRoutes = require(
  "./routes/pairCode.routes"
);
const networkProfileRoutes = require(
  "./routes/networkProfile.routes"
);
const commandRoutes = require("./routes/command.routes");

/* ======================================================
   MODULE ROUTES
====================================================== */

const userModuleRoutes = require(
  "./modules/users/user.routes"
);

const walletModuleRoutes = require(
  "./modules/wallet/wallet.routes"
);

const apiProviderRoutes = require(
  "./modules/api-marketplace/api-provider.routes"
);

const apiServiceRoutes = require(
  "./modules/api-marketplace/api-service.routes"
);

const apiKeyModuleRoutes = require(
  "./modules/api-marketplace/api-key.routes"
);

const apiUsageRoutes = require(
  "./modules/api-marketplace/api-usage.routes"
);

const webhookRoutes = require(
  "./modules/api-marketplace/webhook.routes"
);

const documentationRoutes = require(
  "./modules/api-marketplace/documentation.routes"
);

const apiMarketplaceDashboardRoutes = require(
  "./modules/api-marketplace/api-marketplace-dashboard.routes"
);

const superAdminRoutes = require(
  "./modules/super-admin/super-admin.routes"
);

const {
  notFound,
  errorHandler,
} = require("./middlewares/error.middleware");

/* ======================================================
   APP
====================================================== */

const app = express();

/* ======================================================
   CORS
====================================================== */

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      /*
       * Requests daga Postman, mobile apps,
       * server-to-server requests ko curl
       * ba sa turo Origin header.
       */
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          `CORS blocked request from origin: ${origin}`
        )
      );
    },
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-api-key",
      "x-paystack-signature",
    ],
  })
);

/* ======================================================
   SECURITY AND LOGGING
====================================================== */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(morgan("dev"));

/* ======================================================
   PAYSTACK WEBHOOK RAW BODY

   Dole wannan ya zo kafin express.json().
   Full endpoint:
   POST /api/v1/wallet/paystack/webhook
====================================================== */

app.use(
  "/api/v1/wallet/paystack/webhook",
  express.raw({
    type: "application/json",
    limit: "2mb",
  })
);

/* ======================================================
   BODY PARSERS
====================================================== */

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/* ======================================================
   ROOT
====================================================== */

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Ayax API Marketplace Backend is running",
    version: "1.0.0",
    environment:
      process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

/* ======================================================
   HEALTH
====================================================== */

app.use(
  "/api/v1/health",
  healthRoutes
);

/* ======================================================
   AUTHENTICATION
====================================================== */

app.use(
  "/api/v1/auth",
  authRoutes
);

/* ======================================================
   ADMIN
====================================================== */

app.use(
  "/api/v1/admin",
  adminRoutes
);

app.use(
  "/api/v1/super-admin",
  superAdminRoutes
);

/*
 * Admin wallet management:
 *
 * GET    /api/v1/admin/wallet/me
 * GET    /api/v1/admin/wallet/statistics
 * GET    /api/v1/admin/wallet/ledger
 * GET    /api/v1/admin/wallet/user/:userId
 * POST   /api/v1/admin/wallet/funding
 * PATCH  /api/v1/admin/wallet/funding/:id/approve
 * PATCH  /api/v1/admin/wallet/funding/:id/reject
 * POST   /api/v1/admin/wallet/withdrawal
 * PATCH  /api/v1/admin/wallet/withdrawal/:id/approve
 * PATCH  /api/v1/admin/wallet/withdrawal/:id/reject
 * POST   /api/v1/admin/wallet/adjust
 */
app.use(
  "/api/v1/admin/wallet",
  walletModuleRoutes
);

/* ======================================================
   USERS
====================================================== */

app.use(
  "/api/v1/users",
  userModuleRoutes
);

/* ======================================================
   DEVELOPER WALLET

   GET  /api/v1/wallet
   GET  /api/v1/wallet/transactions
   POST /api/v1/wallet/fund
   GET  /api/v1/wallet/funding-requests
   POST /api/v1/wallet/paystack/initialize
   GET  /api/v1/wallet/paystack/verify/:reference
   POST /api/v1/wallet/paystack/webhook
====================================================== */

app.use(
  "/api/v1/wallet",
  walletRoutes
);

/* ======================================================
   TRANSACTIONS AND FINANCE
====================================================== */

app.use(
  "/api/v1/transactions",
  transactionRoutes
);

app.use(
  "/api/v1/refunds",
  refundRoutes
);

app.use(
  "/api/v1/pricing",
  pricingRoutes
);

app.use(
  "/api/v1/plans",
  apiPlanRoutes
);

app.use(
  "/api/v1/purchase",
  purchaseRoutes
);

/* ======================================================
   SUPPORT AND AUDIT
====================================================== */

app.use(
  "/api/v1/support",
  supportRoutes
);

app.use(
  "/api/v1/audit",
  auditRoutes
);

/* ======================================================
   PARTNERS
====================================================== */

app.use(
  "/api/v1/partners",
  partnerRoutes
);

/* ======================================================
   API MARKETPLACE
====================================================== */

app.use(
  "/api/v1/api-providers",
  apiProviderRoutes
);

app.use(
  "/api/v1/api-services",
  apiServiceRoutes
);

app.use(
  "/api/v1/api-keys",
  apiKeyModuleRoutes
);

app.use(
  "/api/v1/api-usage",
  apiUsageRoutes
);

app.use(
  "/api/v1/webhooks",
  webhookRoutes
);

app.use(
  "/api/v1/api-docs",
  documentationRoutes
);

app.use(
  "/api/v1/api-marketplace",
  apiMarketplaceDashboardRoutes
);

app.use(
  "/api/v1/marketplace",
  marketplaceRoutes
);

/* ======================================================
   DIGITAL SERVICES
====================================================== */

app.use(
  "/api/v1/data",
  dataRoutes
);

app.use(
  "/api/v1/airtime",
  airtimeRoutes
);

/* ======================================================
   GSM GATEWAY
====================================================== */

app.use(
  "/api/v1/gsm",
  gsmRoutes
);

app.use(
  "/api/v1/gateway",
  gatewayRoutes
);

app.use(
  "/api/v1/network-profiles",
  networkProfileRoutes
);

app.use(
  "/api/v1/commands",
  commandRoutes
);

app.use(
  "/api/v1/pair-codes",
  pairCodeRoutes
);

app.use(
  "/api/v1/notifications",
  notificationRoutes
);
/* ======================================================
   404 AND GLOBAL ERROR HANDLER

   Dole su kasance a ƙarshe.
====================================================== */

app.use(notFound);
app.use(errorHandler);

module.exports = app;