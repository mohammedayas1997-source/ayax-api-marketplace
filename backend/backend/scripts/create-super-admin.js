const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123456", 10);

  const user = await prisma.user.upsert({
    where: {
      email: "superadmin@ayax.com",
    },
    update: {
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      password,
    },
    create: {
      name: "Super Admin",
      email: "superadmin@ayax.com",
      phone: "08000000000",
      password,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
  });

  console.log("==================================");
  console.log("SUPER ADMIN CREATED");
  console.log("Email :", user.email);
  console.log("Role  :", user.role);
  console.log("==================================");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });