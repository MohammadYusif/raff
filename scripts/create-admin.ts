// scripts/create-admin.ts
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@raff.sa";
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  const name = process.env.ADMIN_NAME || "Raff Admin";

  console.log("Creating admin user...");

  // Check if admin user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`Admin user already exists: ${email}`);
    console.log(`Updating to ADMIN role...`);

    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });

    console.log("✅ User updated to ADMIN role");
    return;
  }

  // Create new admin user
  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  console.log("✅ Admin user created successfully!");
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${password}`);
  console.log(`Role: ${admin.role}`);
  console.log("\n⚠️  IMPORTANT: Change the password after first login!");
}

main()
  .catch((error) => {
    console.error("Error creating admin user:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
