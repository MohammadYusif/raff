// scripts/cleanup-webhook-events.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name, fallback) {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!arg) return fallback;
  return arg.split("=").slice(1).join("=") || fallback;
}

const days = Number(getArg("--days", "90"));
const dryRun = process.argv.includes("--dry-run");

if (!Number.isFinite(days) || days <= 0) {
  console.error("Invalid --days value. Example: --days=90");
  process.exit(1);
}

const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function main() {
  console.log(`📅 Cutoff date: ${cutoff.toISOString()}`);
  console.log(`🗑️  Retention period: ${days} days`);

  if (dryRun) {
    const count = await prisma.webhookEvent.count({
      where: { createdAt: { lt: cutoff } },
    });
    console.log(
      `\n[DRY RUN] Would delete ${count} webhookEvent rows older than ${days} days (before ${cutoff.toISOString()})`
    );

    if (count > 0) {
      // Show breakdown by platform
      const breakdown = await prisma.webhookEvent.groupBy({
        by: ["platform"],
        where: { createdAt: { lt: cutoff } },
        _count: true,
      });

      console.log("\nBreakdown by platform:");
      breakdown.forEach((item) => {
        console.log(`  - ${item.platform}: ${item._count} events`);
      });
    }
    return;
  }

  const result = await prisma.webhookEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  console.log(
    `\n✅ Deleted ${result.count} webhookEvent rows older than ${days} days (before ${cutoff.toISOString()})`
  );

  // Show remaining count
  const remaining = await prisma.webhookEvent.count();
  console.log(`📊 Remaining webhook events: ${remaining}`);
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
