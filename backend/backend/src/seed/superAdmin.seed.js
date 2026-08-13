const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");

async function main() {
  const email = "abdulrahman.ayas@ayaxapis.com";

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("Super Admin already exists.");
    return;
  }

  const password = await bcrypt.hash("Abdulayasayaxpassword@2026", 12);

  const user = await prisma.user.create({
    data: {
      name: "Ayax Super Admin",
      email,
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

  console.log("Super Admin created:");
  console.log("Email:", email);
  console.log("Password: Abdulayasayaxpassword@2026");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });