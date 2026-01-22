// src/app/api/admin/sync-all/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth/admin-guard";
import { createLogger } from "@/lib/utils/logger";
import { syncZidCategories, syncZidProducts } from "@/lib/sync/zidProducts";
import { syncSallaProductsForMerchant } from "@/lib/sync/sallaProducts";
import { syncSallaStoreInfo } from "@/lib/sync/sallaStore";
import { isZidConnected } from "@/lib/zid/isZidConnected";

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
        sallaAccessToken: true,
        zidStoreId: true,
        zidStoreUrl: true,
        zidAccessToken: true,
        zidRefreshToken: true,
        zidTokenExpiry: true,
        zidManagerToken: true,
        lastSyncAt: true,
      },
    });

    logger.info(`Found ${merchants.length} merchants to sync`);

    // Sync each merchant directly (sequentially to avoid overwhelming APIs)
    const results: { merchantId: string; name: string; success: boolean; error?: string }[] = [];

    for (const merchant of merchants) {
      const isZid = isZidConnected(merchant);
      const isSalla = !!merchant.sallaAccessToken;
      const platform = isZid ? "zid" : isSalla ? "salla" : null;

      if (!platform) {
        logger.warn(`Skipping merchant ${merchant.name} - no valid connection`, {
          merchantId: merchant.id,
        });
        results.push({ merchantId: merchant.id, name: merchant.name, success: false, error: "No valid connection" });
        continue;
      }

      // Check rate limit (5 min between syncs)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (merchant.lastSyncAt && merchant.lastSyncAt > fiveMinutesAgo) {
        logger.info(`Skipping merchant ${merchant.name} - recently synced`, {
          merchantId: merchant.id,
          lastSyncAt: merchant.lastSyncAt.toISOString(),
        });
        results.push({ merchantId: merchant.id, name: merchant.name, success: true, error: "Recently synced" });
        continue;
      }

      try {
        logger.info(`[${platform.toUpperCase()}] Syncing merchant ${merchant.name}`, { merchantId: merchant.id, platform });

        if (platform === "zid") {
          logger.info(`[ZID] Starting categories sync for ${merchant.name}`, { merchantId: merchant.id });
          await syncZidCategories(merchant.id);
          logger.info(`[ZID] Starting products sync for ${merchant.name}`, { merchantId: merchant.id });
          await syncZidProducts(merchant.id);
        } else {
          logger.info(`[SALLA] Starting store info sync for ${merchant.name}`, { merchantId: merchant.id });
          await syncSallaStoreInfo(merchant.id);
          logger.info(`[SALLA] Starting products sync for ${merchant.name}`, { merchantId: merchant.id });
          await syncSallaProductsForMerchant(merchant.id);
        }

        // Update lastSyncAt
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { lastSyncAt: new Date() },
        });

        logger.info(`[${platform.toUpperCase()}] Synced merchant ${merchant.name} successfully`, { merchantId: merchant.id, platform });
        results.push({ merchantId: merchant.id, name: merchant.name, success: true });
      } catch (error) {
        logger.error(`[${platform.toUpperCase()}] Failed to sync merchant ${merchant.name}`, {
          merchantId: merchant.id,
          platform,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        results.push({
          merchantId: merchant.id,
          name: merchant.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info("Sync-all operation completed", { successful, failed });

    return NextResponse.json({
      success: true,
      message: `Synced ${successful} merchants, ${failed} failed`,
      total: merchants.length,
      successful,
      failed,
      results,
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
