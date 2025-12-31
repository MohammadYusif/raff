import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function generateTempPassword(): string {
  return crypto.randomBytes(12).toString("hex");
}

async function main() {
  const merchants = await prisma.merchant.findMany({
    where: { userId: null },
    select: { id: true, email: true, name: true },
  });

  const createdUsers: Array<{ email: string; tempPassword: string }> = [];
  let linkedCount = 0;

  for (const merchant of merchants) {
    const email = merchant.email;
    if (!email) {
      continue;
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      user = await prisma.user.create({
        data: {
          name: merchant.name,
          email,
          passwordHash,
          role: UserRole.MERCHANT,
          language: "ar",
          emailVerified: new Date(),
        },
      });

      createdUsers.push({ email, tempPassword });
    } else if (user.role !== UserRole.MERCHANT) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.MERCHANT },
      });
    }

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { userId: user.id },
    });

    linkedCount += 1;
  }

  console.log(`Linked ${linkedCount} merchants to users.`);

  if (createdUsers.length) {
    console.log("Temporary passwords for newly created merchant users:");
    for (const entry of createdUsers) {
      console.log(`${entry.email}: ${entry.tempPassword}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Failed to link merchants to users:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
