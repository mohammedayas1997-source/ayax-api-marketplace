const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

require("./config/env");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const transactionRoutes = require("./routes/transaction.routes");
const refundRoutes = require("./routes/refund.routes");
const supportRoutes = require("./routes/support.routes");
const pricingRoutes = require("./routes/pricing.routes");
const purchaseRoutes = require("./routes/purchase.routes");
const gsmRoutes = require("./routes/gsm.routes");
const auditRoutes = require("./routes/audit.routes");

const healthRoutes = require("./routes/health.routes");
const dataRoutes = require("./routes/data.routes");
const airtimeRoutes = require("./routes/airtime.routes");

const userModuleRoutes = require("./modules/users/user.routes");
const walletModuleRoutes = require("./modules/wallet/wallet.routes");

const apiProviderRoutes = require("./modules/api-marketplace/api-provider.routes");
const apiServiceRoutes = require("./modules/api-marketplace/api-service.routes");
const apiPlanRoutes = require("./modules/api-marketplace/api-plan.routes");
const apiKeyModuleRoutes = require("./modules/api-marketplace/api-key.routes");
const apiUsageRoutes = require("./modules/api-marketplace/api-usage.routes");
const webhookRoutes = require("./modules/api-marketplace/webhook.routes");
const documentationRoutes = require("./modules/api-marketplace/documentation.routes");
const superAdminRoutes = require("./modules/super-admin/super-admin.routes");
const {
  notFound,
  errorHandler,
} = require("./middlewares/error.middleware");
const apiMarketplaceDashboardRoutes = require("./modules/api-marketplace/api-marketplace-dashboard.routes");

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Ayax API Marketplace Backend is running",
  });
});

app.use("/api/v1/health", healthRoutes);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/refunds", refundRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/pricing", pricingRoutes);
app.use("/api/v1/purchase", purchaseRoutes);
app.use("/api/v1/gsm", gsmRoutes);
app.use("/api/v1/audit", auditRoutes);

app.use("/api/v1/users", userModuleRoutes);
app.use("/api/v1/wallet", walletModuleRoutes);

app.use("/api/v1/api-providers", apiProviderRoutes);
app.use("/api/v1/api-services", apiServiceRoutes);
app.use("/api/v1/api-plans", apiPlanRoutes);
app.use("/api/v1/api-keys", apiKeyModuleRoutes);
app.use("/api/v1/api-usage", apiUsageRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/api-docs", documentationRoutes);
app.use("/api/v1/super-admin", superAdminRoutes);
app.use("/api/v1/data", dataRoutes);
app.use("/api/v1/airtime", airtimeRoutes);
app.use("/api/v1/api-marketplace", apiMarketplaceDashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;