const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {

  const provider = await prisma.apiProvider.upsert({
    where: {
      code: "LOCAL_PROVIDER",
    },
    update: {},
    create: {
      name: "Ayax Local Provider",
      code: "LOCAL_PROVIDER",
      status: "ACTIVE",
    },
  });

  const service = await prisma.apiService.upsert({
    where: {
      code: "DATA",
    },
    update: {},
    create: {
      providerId: provider.id,
      name: "Data Subscription",
      code: "DATA",
      category: "DATA",
      status: "ACTIVE",
    },
  });

  const plans = [

    ["MTN","500MB",220],
    ["MTN","1GB",430],
    ["MTN","2GB",820],
    ["MTN","3GB",1200],
    ["MTN","5GB",1950],
    ["MTN","10GB",3800],
    ["MTN","15GB",5600],
    ["MTN","20GB",7300],
    ["MTN","25GB",9000],
    ["MTN","30GB",10700],
    ["MTN","40GB",14200],
    ["MTN","50GB",17500],
    ["MTN","75GB",26000],
    ["MTN","100GB",34000],

    ["Airtel","500MB",210],
    ["Airtel","1GB",420],
    ["Airtel","2GB",800],
    ["Airtel","3GB",1180],
    ["Airtel","5GB",1900],
    ["Airtel","10GB",3700],
    ["Airtel","15GB",5500],
    ["Airtel","20GB",7200],
    ["Airtel","25GB",8900],
    ["Airtel","30GB",10500],
    ["Airtel","40GB",14000],
    ["Airtel","50GB",17000],
    ["Airtel","75GB",25500],
    ["Airtel","100GB",33500],

    ["Glo","500MB",190],
    ["Glo","1GB",390],
    ["Glo","2GB",760],
    ["Glo","3GB",1120],
    ["Glo","5GB",1800],
    ["Glo","10GB",3500],
    ["Glo","15GB",5200],
    ["Glo","20GB",6900],
    ["Glo","25GB",8500],
    ["Glo","30GB",10000],
    ["Glo","40GB",13300],
    ["Glo","50GB",16500],
    ["Glo","75GB",24500],
    ["Glo","100GB",32000],

    ["9mobile","500MB",230],
    ["9mobile","1GB",450],
    ["9mobile","2GB",850],
    ["9mobile","3GB",1260],
    ["9mobile","5GB",2050],
    ["9mobile","10GB",4000],
    ["9mobile","15GB",5900],
    ["9mobile","20GB",7800],
    ["9mobile","25GB",9600],
    ["9mobile","30GB",11400],
    ["9mobile","40GB",15000],
    ["9mobile","50GB",18000],
    ["9mobile","75GB",27000],
    ["9mobile","100GB",35000],

  ];

  for (const plan of plans) {

    const [network,size,price]=plan;

    await prisma.apiPlan.upsert({

      where:{
        code:`${network}_${size}`
      },

      update:{
        sellingPrice:price
      },

      create:{
        providerId:provider.id,
        serviceId:service.id,
        code:`${network}_${size}`,
        name:`${network} ${size}`,
        network,
        size,
        costPrice:price-10,
        sellingPrice:price,
        status:"ACTIVE"
      }

    });

  }

  console.log("✅ Data Plans Seeded Successfully");

}

main()
.finally(async()=>{
 await prisma.$disconnect();
});

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

  // StarTimes Packages (Monthly)
  { cableTv: "startimes", packageCode: "11", name: "StarTimes Nova (Monthly)", price: 1700, apiPrice: 1650 },
  { cableTv: "startimes", packageCode: "12", name: "StarTimes Basic (Monthly)", price: 3300, apiPrice: 3250 },
  { cableTv: "startimes", packageCode: "13", name: "StarTimes Smart (Monthly)", price: 4700, apiPrice: 4600 },
  { cableTv: "startimes", packageCode: "14", name: "StarTimes Classic (Monthly)", price: 5500, apiPrice: 5400 },
  { cableTv: "startimes", packageCode: "15", name: "StarTimes Super (Monthly)", price: 8200, apiPrice: 8050 },
];

async function main() {
  console.log("Seeding Cable TV plans...");

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
  }

  console.log("Cable TV plans seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  const electricityDiscos = [
  {
    discoCode: "ikeja-electric",
    name: "Ikeja Electric (IKEDC)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
  {
    discoCode: "eko-electric",
    name: "Eko Electric (EKEDC)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
  {
    discoCode: "kano-electric",
    name: "Kano Electric (KEDCO)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
  {
    discoCode: "abuja-electric",
    name: "Abuja Electric (AEDC)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
  {
    discoCode: "ibadan-electric",
    name: "Ibadan Electric (IBEDC)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
  {
    discoCode: "enugu-electric",
    name: "Enugu Electric (EEDC)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
  {
    discoCode: "port-harcourt-electric",
    name: "Port Harcourt Electric (PHED)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
  {
    discoCode: "jos-electric",
    name: "Jos Electric (JED)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
  {
    discoCode: "kaduna-electric",
    name: "Kaduna Electric (KAEDCO)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
  {
    discoCode: "benin-electric",
    name: "Benin Electric (BEDC)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
  {
    discoCode: "yola-electric",
    name: "Yola Electric (YEDC)",
    supportsPrepaid: true,
    supportsPostpaid: true,
    minAmount: 500,
  },
];

async function seedDiscos() {
  console.log("Seeding Electricity DISCOs...");

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

  console.log("Electricity DISCOs seeded successfully!");
}

async function main() {
  await seedDiscos();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });