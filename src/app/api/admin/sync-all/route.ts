// src/app/api/admin/sync-all/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth/admin-guard";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin-sync-all");

export async function POST() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    logger.info("Starting sync-all operation");

    // Get all active merchants that need syncing
    const merchants = await prisma.merchant.findMany({
      where: {
        status: "APPROVED",
        isActive: true,
        OR: [
          { sallaStoreId: { not: null } },
          { zidStoreId: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        sallaStoreId: true,
        zidStoreId: true,
      },
    });

    logger.info(`Found ${merchants.length} merchants to sync`);

    // Queue sync jobs for each merchant (in production, this would use a job queue)
    const syncResults = await Promise.allSettled(
      merchants.map(async (merchant) => {
        const platform = merchant.sallaStoreId ? "salla" : "zid";
        try {
          // Trigger the merchant sync endpoint
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/merchant/sync`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ merchantId: merchant.id }),
            }
          );

          if (!response.ok) {
            throw new Error(`Sync failed for merchant ${merchant.id}`);
          }

          logger.info(`Synced merchant ${merchant.name}`, { merchantId: merchant.id, platform });
          return { merchantId: merchant.id, success: true };
        } catch (error) {
          logger.error(`Failed to sync merchant ${merchant.name}`, {
            merchantId: merchant.id,
            platform,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return { merchantId: merchant.id, success: false };
        }
      })
    );

    const successful = syncResults.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = syncResults.length - successful;

    logger.info("Sync-all operation completed", { successful, failed });

    return NextResponse.json({
      success: true,
      message: `Synced ${successful} merchants, ${failed} failed`,
      total: merchants.length,
      successful,
      failed,
    });
  } catch (error) {
    logger.error("Sync-all operation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to sync all merchants" },
      { status: 500 }
    );
  }
}
