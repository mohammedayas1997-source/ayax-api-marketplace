// seed-gsm.js
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding GSM Gateway Provider & Airtime Service...");

  // 1. Kirkiri ko Nemi ApiProvider (GSM Gateway)
  const provider = await prisma.apiProvider.upsert({
    where: { slug: "gsm-gateway" },
    update: {
      status: "ACTIVE",
    },
    create: {
      name: "GSM Gateway",
      code: "GSM_GATEWAY",
      slug: "gsm-gateway",
      baseUrl: process.env.GSM_GATEWAY_URL || "https://gsm-gateway.onrender.com",
      apiKey: "live_gsm_key",
      secretKey: "live_gsm_secret",
      status: "ACTIVE",
    },
  });

  console.log("✓ Provider ready:", provider.name);

  // 2. Kirkiri ko Nemi ApiService mai slug "airtime"
  const service = await prisma.apiService.upsert({
    where: { slug: "airtime" },
    update: {
      providerId: provider.id,
      endpoint: "/airtime/buy",
      status: "ACTIVE",
    },
    create: {
      name: "Airtime Topup",
      code: "AIRTIME_TOPUP",
      slug: "airtime",
      category: "AIRTIME",
      endpoint: "/airtime/buy",
      providerId: provider.id,
      status: "ACTIVE",
    },
  });

  console.log("✓ Service created/updated:", service.name, `(slug: ${service.slug})`);
  console.log("✅ Database Seed Successful!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });