const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const hpp = require("hpp");
const crypto = require("crypto");

const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

require("./config/env");

/* ======================================================
   ROUTES
====================================================== */

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const transactionRoutes = require("./routes/transaction.routes");
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
const apiPlanRoutes = require("./routes/apiPlan.routes");
const notificationRoutes = require("./routes/notification.routes");
const servicePricingRoutes = require("./routes/servicePricing.routes");
const marketplaceRoutes = require("./routes/marketplace.routes");
const gatewayRoutes = require("./routes/gateway.routes");
const pairCodeRoutes = require("./routes/pairCode.routes");
const networkProfileRoutes = require("./routes/networkProfile.routes");
const commandRoutes = require("./routes/command.routes");
const adminNotificationRoutes = require("./routes/adminNotification.routes");
const mainWebhookRoutes = require("./routes/webhookRoutes");

/* ======================================================
   MODULE ROUTES
====================================================== */

const userModuleRoutes = require("./modules/users/user.routes");
const adminWalletRoutes = require("./modules/wallet/wallet.routes");
const userWalletRoutes = require("./modules/wallet/wallet.routes");

const apiProviderRoutes = require("./modules/api-marketplace/api-provider.routes");
const apiServiceRoutes = require("./modules/api-marketplace/api-service.routes");
const apiKeyModuleRoutes = require("./modules/api-marketplace/api-key.routes");
const apiUsageRoutes = require("./modules/api-marketplace/api-usage.routes");
const marketplaceWebhookRoutes = require("./modules/api-marketplace/webhook.routes");
const documentationRoutes = require("./modules/api-marketplace/documentation.routes");
const apiMarketplaceDashboardRoutes = require("./modules/api-marketplace/api-marketplace-dashboard.routes");

const identityRoutes = require("./routes/identity.routes");

const tierRoutes = require("./routes/tier.routes");

const superAdminRoutes = require("./routes/superAdminRoutes");
const aiRoutes = require("./modules/ai/ai.routes");

const { notFound, errorHandler } = require("./middlewares/error.middleware");

/* ======================================================
   APP SETUP
====================================================== */

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
app.set("trust proxy", 1);

/* ======================================================
   HELPERS & CORS
====================================================== */

const normalizeOrigin = (value) => {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
};

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "https://ayaxdata.online",
  "https://www.ayaxdata.online",
  "https://ayaxapis.com",
  "https://www.ayaxapis.com",
  process.env.FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
]
  .map(normalizeOrigin)
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedRequestOrigin = normalizeOrigin(origin);

    if (
      allowedOrigins.includes(normalizedRequestOrigin) ||
      !isProduction ||
      normalizedRequestOrigin.endsWith(".ayaxdata.online") ||
      normalizedRequestOrigin.endsWith(".ayaxapis.com")
    ) {
      return callback(null, true);
    }

    console.error("CORS blocked origin:", normalizedRequestOrigin);

    const error = new Error("This origin is not permitted to access the API.");
    error.statusCode = 403;
    error.code = "CORS_ORIGIN_BLOCKED";

    return callback(error);
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Accept",
    "Content-Type",
    "Authorization",
    "x-api-key",
    "x-request-id",
    "x-paystack-signature",
    "x-idempotency-key",
  ],

  exposedHeaders: [
    "x-request-id",
    "x-api-version",
    "retry-after",
    "ratelimit",
    "ratelimit-policy",
    "ratelimit-limit",
    "ratelimit-remaining",
    "ratelimit-reset",
  ],

  maxAge: 86400,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

/* ======================================================
   SECURITY HEADERS
====================================================== */

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    frameguard: { action: "deny" },
    noSniff: true,
  })
);

app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-API-Version", "v1");
  next();
});

app.use(compression());
app.use(isProduction ? morgan("combined") : morgan("dev"));

/* ======================================================
   REQUEST ID
====================================================== */

app.use((req, res, next) => {
  const incomingId = req.headers["x-request-id"];
  let requestId;

  if (typeof incomingId === "string" && incomingId.trim()) {
    requestId = incomingId.trim().slice(0, 128);
  } else if (typeof crypto.randomUUID === "function") {
    requestId = crypto.randomUUID();
  } else {
    requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

/* ======================================================
   MAINTENANCE MODE
====================================================== */

if (process.env.MAINTENANCE_MODE === "true") {
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api/v1/health")) {
      return next();
    }

    return res.status(503).json({
      success: false,
      code: "SYSTEM_MAINTENANCE",
      message: "System is currently under maintenance.",
      requestId: req.requestId,
    });
  });
}

/* ======================================================
   PAYSTACK WEBHOOK RAW BODY CAPTURE
====================================================== */

app.use(
  express.json({
    limit: "2mb",
    verify: (req, res, buf) => {
      if (req.originalUrl.includes("/paystack/webhook")) {
        req.rawBody = buf;
      }
    },
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb",
    parameterLimit: 1000,
  })
);

app.use(hpp());

/* ======================================================
   RATE LIMITERS
====================================================== */

const rateLimitHandler = (req, res) => {
  return res.status(429).json({
    success: false,
    code: "TOO_MANY_REQUESTS",
    message: "Too many requests. Please wait and try again.",
    requestId: req.requestId,
  });
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 600 : 5000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip(req) {
    return (
      req.path === "/" ||
      req.originalUrl.startsWith("/api/v1/health") ||
      req.originalUrl.includes("/paystack/webhook")
    );
  },
  handler: rateLimitHandler,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 15 : 200,
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
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please wait 15 minutes and try again.",
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

app.use(globalLimiter);

/* ======================================================
   ROOT
====================================================== */

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Ayax API Marketplace Backend is running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

/* ======================================================
   ROUTES MOUNTING
====================================================== */

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/admin", adminLimiter, adminRoutes);
app.use("/api/v1/super-admin", adminLimiter, superAdminRoutes);
app.use("/api/v1/webhook", mainWebhookRoutes);

app.use("/api/v1/admin/wallet", adminLimiter, adminWalletRoutes);
app.use("/api/v1/users", userModuleRoutes);
app.use("/api/v1/wallet", userWalletRoutes);

app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/refunds", refundRoutes);
app.use("/api/v1/pricing", pricingRoutes);
app.use("/api/v1/plans", apiPlanRoutes);
app.use("/api/v1/purchase", purchaseRoutes);
app.use("/api/v1/service-pricing", servicePricingRoutes);
app.use("/api/v1/admin/notifications", adminLimiter, adminNotificationRoutes);

app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/partners", partnerRoutes);
app.use("/api/v1/api-providers", apiProviderRoutes);
app.use("/api/v1/api-services", apiServiceRoutes);
app.use("/api/v1/api-keys", apiKeyModuleRoutes);
app.use("/api/v1/api-usage", apiUsageRoutes);
app.use("/api/v1/webhooks", marketplaceWebhookRoutes);
app.use("/api/v1/api-docs", documentationRoutes);
app.use("/api/v1/api-marketplace", apiMarketplaceDashboardRoutes);
app.use("/api/v1/marketplace", marketplaceRoutes);

/* Digital Services */
app.use("/api/v1/data", dataRoutes);
app.use("/api/v1/airtime", airtimeRoutes);

app.use("/api/v1/tiers", tierRoutes);

app.use("/api/v1/identity", identityRoutes);
// Compatibility aliases for legacy/frontend calls
app.use("/api/v1/vtu/airtime", airtimeRoutes);
app.post("/api/v1/vtu/airtime", (req, res, next) => {
  req.url = "/buy";
  return airtimeRoutes(req, res, next);
});

app.use("/api/v1/gsm", gsmRoutes);
app.use("/api/v1/gateway", gatewayRoutes);
app.use("/api/v1/network-profiles", networkProfileRoutes);
app.use("/api/v1/commands", commandRoutes);
app.use("/api/v1/pair-codes", pairCodeRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/ai", aiRoutes);

try {
  app.use("/api/v1/bills", require("./routes/bills.routes"));
} catch (e) {
  // bills routes optional
}

/* ======================================================
   PAYLOAD & ERROR HANDLERS
====================================================== */

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      code: "INVALID_JSON",
      message: "Invalid JSON payload.",
      requestId: req.requestId,
    });
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      code: "PAYLOAD_TOO_LARGE",
      message: "Request payload is too large.",
      requestId: req.requestId,
    });
  }

  if (
    error?.code === "CORS_ORIGIN_BLOCKED" ||
    error?.message?.includes("not permitted to access the API")
  ) {
    return res.status(403).json({
      success: false,
      code: "CORS_ORIGIN_BLOCKED",
      message: "This website is not permitted to access the API.",
      requestId: req.requestId,
    });
  }

  return next(error);
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;