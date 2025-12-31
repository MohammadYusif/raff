// scripts/export-db.ts
import { prisma } from "../src/lib/db";

async function run() {
  console.log("ClickTracking:");
  console.log(await prisma.clickTracking.findMany());

  console.log("\nCommission:");
  console.log(await prisma.commission.findMany());

  console.log("\nWebhookLog:");
  console.log(await prisma.webhookLog.findMany());
}

run().finally(() => process.exit());
