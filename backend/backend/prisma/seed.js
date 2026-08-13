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