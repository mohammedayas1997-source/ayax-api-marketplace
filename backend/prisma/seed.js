const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 1. DATA PLANS
const dataPlans = [
  // MTN
  ["MTN", "500MB", 220],
  ["MTN", "1GB", 430],
  ["MTN", "2GB", 820],
  ["MTN", "3GB", 1200],
  ["MTN", "5GB", 1950],
  ["MTN", "10GB", 3800],
  ["MTN", "15GB", 5600],
  ["MTN", "20GB", 7300],
  ["MTN", "25GB", 9000],
  ["MTN", "30GB", 10700],
  ["MTN", "40GB", 14200],
  ["MTN", "50GB", 17500],
  ["MTN", "75GB", 26000],
  ["MTN", "100GB", 34000],

  // Airtel
  ["AIRTEL", "500MB", 210],
  ["AIRTEL", "1GB", 420],
  ["AIRTEL", "2GB", 800],
  ["AIRTEL", "3GB", 1180],
  ["AIRTEL", "5GB", 1900],
  ["AIRTEL", "10GB", 3700],
  ["AIRTEL", "15GB", 5500],
  ["AIRTEL", "20GB", 7200],
  ["AIRTEL", "25GB", 8900],
  ["AIRTEL", "30GB", 10500],
  ["AIRTEL", "40GB", 14000],
  ["AIRTEL", "50GB", 17000],
  ["AIRTEL", "75GB", 25500],
  ["AIRTEL", "100GB", 33500],

  // Glo
  ["GLO", "500MB", 190],
  ["GLO", "1GB", 390],
  ["GLO", "2GB", 760],
  ["GLO", "3GB", 1120],
  ["GLO", "5GB", 1800],
  ["GLO", "10GB", 3500],
  ["GLO", "15GB", 5200],
  ["GLO", "20GB", 6900],
  ["GLO", "25GB", 8500],
  ["GLO", "30GB", 10000],
  ["GLO", "40GB", 13300],
  ["GLO", "50GB", 16500],
  ["GLO", "75GB", 24500],
  ["GLO", "100GB", 32000],

  // 9mobile
  ["9MOBILE", "500MB", 230],
  ["9MOBILE", "1GB", 450],
  ["9MOBILE", "2GB", 850],
  ["9MOBILE", "3GB", 1260],
  ["9MOBILE", "5GB", 2050],
  ["9MOBILE", "10GB", 4000],
  ["9MOBILE", "15GB", 5900],
  ["9MOBILE", "20GB", 7800],
  ["9MOBILE", "25GB", 9600],
  ["9MOBILE", "30GB", 11400],
  ["9MOBILE", "40GB", 15000],
  ["9MOBILE", "50GB", 18000],
  ["9MOBILE", "75GB", 27000],
  ["9MOBILE", "100GB", 35000],
];

// 2. CABLE TV PLANS
const cablePlans = [
  // GOtv Packages
  { cableTv: "gotv", packageCode: "01", name: "GOtv Smallie (Monthly)", price: 1575, apiPrice: 1550 },
  { cableTv: "gotv", packageCode: "02", name: "GOtv Jinja", price: 3300, apiPrice: 3250 },
  { cableTv: "gotv", packageCode: "03", name: "GOtv Jolli", price: 4850, apiPrice: 4800 },
  { cableTv: "gotv", packageCode: "04", name: "GOtv Max", price: 7200, apiPrice: 7100 },
  { cableTv: "gotv", packageCode: "05", name: "GOtv Supa", price: 9600, apiPrice: 9500 },
  { cableTv: "gotv", packageCode: "06", name: "GOtv Supa Plus", price: 15700, apiPrice: 15500 },

  // DStv Packages
  { cableTv: "dstv", packageCode: "01", name: "DStv Padi", price: 3600, apiPrice: 3550 },
  { cableTv: "dstv", packageCode: "02", name: "DStv Yanga", price: 5100, apiPrice: 5000 },
  { cableTv: "dstv", packageCode: "03", name: "DStv Confam", price: 9300, apiPrice: 9200 },
  { cableTv: "dstv", packageCode: "04", name: "DStv Compact", price: 15700, apiPrice: 15500 },
  { cableTv: "dstv", packageCode: "05", name: "DStv Compact Plus", price: 25000, apiPrice: 24700 },
  { cableTv: "dstv", packageCode: "06", name: "DStv Premium", price: 37000, apiPrice: 36500 },

  // StarTimes Packages
  { cableTv: "startimes", packageCode: "11", name: "StarTimes Nova (Monthly)", price: 1700, apiPrice: 1650 },
  { cableTv: "startimes", packageCode: "12", name: "StarTimes Basic (Monthly)", price: 3300, apiPrice: 3250 },
  { cableTv: "startimes", packageCode: "13", name: "StarTimes Smart (Monthly)", price: 4700, apiPrice: 4600 },
  { cableTv: "startimes", packageCode: "14", name: "StarTimes Classic (Monthly)", price: 5500, apiPrice: 5400 },
  { cableTv: "startimes", packageCode: "15", name: "StarTimes Super (Monthly)", price: 8200, apiPrice: 8050 },
];

// 3. ALL 12 NIGERIAN ELECTRICITY DISCOS
const electricityDiscos = [
  { discoCode: "IKEDC", name: "Ikeja Electric (IKEDC)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "EKEDC", name: "Eko Electric (EKEDC)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "KEDCO", name: "Kano Electric (KEDCO)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "AEDC", name: "Abuja Electric (AEDC)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "IBEDC", name: "Ibadan Electric (IBEDC)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "EEDC", name: "Enugu Electric (EEDC)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "PHED", name: "Port Harcourt Electric (PHED)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "JED", name: "Jos Electric (JED)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "KAEDCO", name: "Kaduna Electric (KAEDCO)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "BEDC", name: "Benin Electric (BEDC)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "YEDC", name: "Yola Electric (YEDC)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
  { discoCode: "ABA", name: "Aba Electric (APLE)", supportsPrepaid: true, supportsPostpaid: true, minAmount: 500 },
];

// 4. IDENTITY VERIFICATION & VALIDATION PRICING
const identityPricing = [
  { serviceCode: "NIN_VERIFY", serviceName: "NIN Verification Lookup", category: "IDENTITY", sellingPrice: 100, tier: "REGULAR" },
  { serviceCode: "BVN_VERIFY", serviceName: "BVN Verification Lookup", category: "IDENTITY", sellingPrice: 70, tier: "REGULAR" },
  { serviceCode: "NIN_VALIDATION_BANK_MISMATCH", serviceName: "NIN/Bank Mismatch Resolution", category: "IDENTITY", sellingPrice: 1500, tier: "REGULAR" },
  { serviceCode: "NIN_VALIDATION_IPE_CLEARANCE", serviceName: "NIMC IPE Clearance", category: "IDENTITY", sellingPrice: 2000, tier: "REGULAR" },
  { serviceCode: "NIN_VALIDATION_NO_RECORD_FOUND", serviceName: "No Record Found Retrieval", category: "IDENTITY", sellingPrice: 1800, tier: "REGULAR" },
  { serviceCode: "NIN_VALIDATION_DOB_MISMATCH", serviceName: "Date of Birth Discrepancy", category: "IDENTITY", sellingPrice: 2500, tier: "REGULAR" },
  { serviceCode: "NIN_VALIDATION_PHOTO_BIOMETRIC_ERROR", serviceName: "Biometric & Photo Re-upload", category: "IDENTITY", sellingPrice: 3000, tier: "REGULAR" },
  { serviceCode: "NIN_VALIDATION_PHONE_NOT_LINKED", serviceName: "Phone Number Link Issue", category: "IDENTITY", sellingPrice: 1500, tier: "REGULAR" },
  { serviceCode: "NIN_VALIDATION_MULTIPLE_NIN_CONFLICT", serviceName: "Multiple Registration Conflict", category: "IDENTITY", sellingPrice: 3500, tier: "REGULAR" },
  { serviceCode: "NIN_VALIDATION_BVN_NIN_UNLINKED", serviceName: "BVN-NIN Link Integration", category: "IDENTITY", sellingPrice: 1200, tier: "REGULAR" },
];

await prisma.apiProvider.upsert({
  where: { code: "ABJIKTECH" },
  update: {
    apiKey: "dv_068de722a84b71ce900a65fa4c17bdf9_1788498653",
    status: "ACTIVE",
    baseUrl: "https://abjiktech.com.ng/api",
  },
  create: {
    name: "Abjiktech Identity Services",
    code: "ABJIKTECH",
    category: "IDENTITY",
    baseUrl: "https://abjiktech.com.ng/api",
    apiKey: "dv_068de722a84b71ce900a65fa4c17bdf9_1788498653",
    status: "ACTIVE",
    priority: 1,
  },
});

async function seedData() {
  console.log("⚡ Seeding Data Plans...");

  const provider = await prisma.apiProvider.upsert({
    where: { code: "LOCAL_PROVIDER" },
    update: {},
    create: {
      name: "Ayax Local Provider",
      code: "LOCAL_PROVIDER",
      status: "ACTIVE",
    },
  });

  const service = await prisma.apiService.upsert({
    where: { code: "DATA" },
    update: {},
    create: {
      providerId: provider.id,
      name: "Data Subscription",
      code: "DATA",
      category: "DATA",
      status: "ACTIVE",
    },
  });

  for (const [network, size, price] of dataPlans) {
    const code = `${network}_${size}`.toUpperCase();

    await prisma.apiPlan.upsert({
      where: { code },
      update: { sellingPrice: price, status: "ACTIVE" },
      create: {
        providerId: provider.id,
        serviceId: service.id,
        code,
        name: `${network} ${size}`,
        network,
        size,
        costPrice: price - 10,
        sellingPrice: price,
        status: "ACTIVE",
      },
    });

    // Haɗa da ServicePricing don daidaituwa
    await prisma.servicePricing.upsert({
      where: {
        category_serviceCode_tier: {
          category: "DATA",
          serviceCode: code,
          tier: "REGULAR",
        },
      },
      update: { sellingPrice: price, enabled: true },
      create: {
        category: "DATA",
        serviceCode: code,
        serviceName: `${network} ${size} Data Plan`,
        sellingPrice: price,
        costPrice: price - 10,
        tier: "REGULAR",
        dataSize: size,
        validityDays: 30,
        enabled: true,
      },
    }).catch(() => null);
  }

  console.log("✅ Data Plans Seeded Successfully");
}

async function seedCable() {
  console.log("⚡ Seeding Cable TV Plans...");

  for (const plan of cablePlans) {
    await prisma.cablePlan.upsert({
      where: {
        cableTv_packageCode: {
          cableTv: plan.cableTv,
          packageCode: plan.packageCode,
        },
      },
      update: {
        name: plan.name,
        price: plan.price,
        apiPrice: plan.apiPrice,
        isActive: true,
      },
      create: {
        provider: "CLUBKONNECT",
        cableTv: plan.cableTv,
        packageCode: plan.packageCode,
        name: plan.name,
        price: plan.price,
        apiPrice: plan.apiPrice,
        isActive: true,
      },
    });

    await prisma.servicePricing.upsert({
      where: {
        category_serviceCode_tier: {
          category: "CABLE",
          serviceCode: `${plan.cableTv.toUpperCase()}_${plan.packageCode}`,
          tier: "REGULAR",
        },
      },
      update: { sellingPrice: plan.price, enabled: true },
      create: {
        category: "CABLE",
        serviceCode: `${plan.cableTv.toUpperCase()}_${plan.packageCode}`,
        serviceName: plan.name,
        sellingPrice: plan.price,
        costPrice: plan.apiPrice,
        tier: "REGULAR",
        enabled: true,
      },
    }).catch(() => null);
  }

  console.log("✅ Cable TV plans seeded successfully!");
}

async function seedElectricity() {
  console.log("⚡ Seeding Electricity DISCOs...");

  for (const disco of electricityDiscos) {
    await prisma.electricityDisco.upsert({
      where: { discoCode: disco.discoCode },
      update: {
        name: disco.name,
        supportsPrepaid: disco.supportsPrepaid,
        supportsPostpaid: disco.supportsPostpaid,
        minAmount: disco.minAmount,
        isActive: true,
      },
      create: {
        discoCode: disco.discoCode,
        name: disco.name,
        provider: "CLUBKONNECT",
        supportsPrepaid: disco.supportsPrepaid,
        supportsPostpaid: disco.supportsPostpaid,
        minAmount: disco.minAmount,
        isActive: true,
      },
    });
  }

  console.log("✅ Electricity DISCOs seeded successfully!");
}

async function seedIdentity() {
  console.log("⚡ Seeding Identity (NIN/BVN) Pricing...");

  for (const item of identityPricing) {
    await prisma.servicePricing.upsert({
      where: {
        category_serviceCode_tier: {
          category: item.category,
          serviceCode: item.serviceCode,
          tier: item.tier,
        },
      },
      update: { sellingPrice: item.sellingPrice, enabled: true },
      create: {
        category: item.category,
        serviceCode: item.serviceCode,
        serviceName: item.serviceName,
        sellingPrice: item.sellingPrice,
        costPrice: Math.max(0, item.sellingPrice - 200),
        tier: item.tier,
        enabled: true,
      },
    }).catch(() => null);
  }

  console.log("✅ Identity pricing seeded successfully!");
}

async function main() {
  await seedData();
  await seedCable();
  await seedElectricity();
  await seedIdentity();
  console.log("\n🚀 All Marketplace Services Successfully Seeded Into Database!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });