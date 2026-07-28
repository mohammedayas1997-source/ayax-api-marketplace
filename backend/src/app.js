const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const hpp = require("hpp");
const {
  rateLimit,
  ipKeyGenerator,
} = require("express-rate-limit");

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
const notificationRoutes =
  require(
    "./routes/notification.routes"
  );

  const servicePricingRoutes = require(
  "./routes/servicePricing.routes"
);

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
const adminNotificationRoutes = require("./routes/adminNotification.routes");

/* ======================================================
   APP
====================================================== */

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
app.set("trust proxy", 1);
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
  "x-request-id",
  "x-paystack-signature",
],

exposedHeaders: [
  "x-request-id",
  "RateLimit-Limit",
  "RateLimit-Remaining",
  "RateLimit-Reset",
    ],
  })
);

/* ======================================================
   SECURITY AND LOGGING
====================================================== */

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    referrerPolicy: {
      policy: "no-referrer",
    },
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    frameguard: {
      action: "deny",
    },
    noSniff: true,
  })
);

app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  next();
});

app.use(hpp());

app.use(compression());

app.use((req, res, next) => {
  res.setHeader("X-API-Version", "v1");
  next();
});

app.use(
  isProduction
    ? morgan("combined")
    : morgan("dev")
);

if (process.env.MAINTENANCE_MODE === "true") {
  app.use((req, res) => {
    return res.status(503).json({
      success: false,
      message:
        "System is currently under maintenance.",
    });
  });
}

/*
 * Request ID domin tracing da audit.
 */
app.use((req, res, next) => {
  const incomingId = req.headers["x-request-id"];

  const requestId =
    typeof incomingId === "string" &&
    incomingId.trim()
      ? incomingId.trim().slice(0, 128)
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 12)}`;

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  next();
});

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
    limit: "2mb",
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb",
    parameterLimit: 1000,
  })
);


/* ======================================================
   RATE LIMITING
====================================================== */

const rateLimitHandler = (req, res) =>
  res.status(429).json({
    success: false,
    message:
      "Too many requests. Please wait and try again.",
    requestId: req.requestId,
  });

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 600 : 5000,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  /*
   * Kada health check da Paystack webhook
   * su shiga global limiter.
   */
  skip(req) {
    return (
      req.path === "/" ||
      req.originalUrl.startsWith("/api/v1/health") ||
      req.originalUrl.startsWith(
        "/api/v1/wallet/paystack/webhook"
      )
    );
  },

  handler: rateLimitHandler,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 12 : 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,

  keyGenerator(req) {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "unknown";

  return `${ipKeyGenerator(req)}:${email}`;
},

  handler(req, res) {
    return res.status(429).json({
      success: false,
      message:
        "Too many authentication attempts. Please wait 15 minutes and try again.",
      requestId: req.requestId,
    });
  },
});

const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: isProduction ? 150 : 2000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: isProduction ? 40 : 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
});

app.use(globalLimiter);

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
  authLimiter,
  authRoutes
);

/* ======================================================
   ADMIN
====================================================== */

app.use(
  "/api/v1/admin",
  adminLimiter,
  adminRoutes
);

app.use(
  "/api/v1/super-admin",
  adminLimiter,
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
  adminLimiter,
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
  "/api/v1/wallet/paystack/initialize",
  paymentLimiter
);

app.use(
  "/api/v1/wallet/paystack/verify",
  paymentLimiter
);

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

app.use(
  "/api/v1/service-pricing",
  servicePricingRoutes
);

app.use(
  "/api/v1/admin/notifications",
  adminLimiter,
  adminNotificationRoutes
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
   PAYLOAD/PARSER ERROR HANDLER
====================================================== */

app.use((error, req, res, next) => {
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload.",
      requestId: req.requestId,
    });
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large.",
      requestId: req.requestId,
    });
  }

  return next(error);
});

/* ======================================================
   404 AND GLOBAL ERROR HANDLER

   Dole su kasance a ƙarshe.
====================================================== */

app.use(notFound);
app.use(errorHandler);

module.exports = app;