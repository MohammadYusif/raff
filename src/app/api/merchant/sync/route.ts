// src/app/api/merchant/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncZidCategories, syncZidProducts } from "@/lib/sync/zidProducts";
import { syncSallaProductsForMerchant } from "@/lib/sync/sallaProducts";
import { syncSallaOrdersForMerchant } from "@/lib/sync/sallaOrders";
import { syncSallaStoreInfo } from "@/lib/sync/sallaStore";
import { requireMerchant } from "@/lib/auth/guards";
import {
  getMissingZidConnectionFields,
  isZidConnected,
} from "@/lib/zid/isZidConnected";

const shouldDebugSync = process.env.RAFF_SYNC_DEBUG === "true";
const debugSyncLog = (message: string, details?: Record<string, unknown>) => {
  if (!shouldDebugSync) return;
  if (details) {
    console.log("[merchant-sync]", message, details);
    return;
  }
  console.log("[merchant-sync]", message);
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMerchant("api");
    if ("response" in auth) return auth.response;
    const { session } = auth;
    const merchantId = session.user.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        { error: "Merchant profile not linked" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedPlatform = body?.platform;
    const syncOrders = Boolean(body?.syncOrders);
    debugSyncLog("sync-request", {
      merchantId,
      requestedPlatform,
    });

    const merchant = await prisma.merchant.findFirst({
      where: {
        id: merchantId,
        userId: session.user.id,
        status: "APPROVED",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        zidStoreId: true,
        zidStoreUrl: true,
        zidAccessToken: true,
        zidRefreshToken: true,
        zidTokenExpiry: true,
        zidManagerToken: true,
        sallaStoreId: true,
        sallaStoreUrl: true,
        sallaAccessToken: true,
        sallaRefreshToken: true,
        sallaTokenExpiry: true,
        lastSyncAt: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found or not approved" },
        { status: 404 }
      );
    }

    const zidConnected = isZidConnected(merchant);
    const isSallaConnected = !!merchant.sallaAccessToken;

    debugSyncLog("connection-status", {
      isZidConnected: zidConnected,
      isSallaConnected,
      hasZidStoreId: Boolean(merchant.zidStoreId),
      hasZidStoreUrl: Boolean(merchant.zidStoreUrl),
      hasZidManagerToken: Boolean(merchant.zidManagerToken),
      hasSallaStoreId: Boolean(merchant.sallaStoreId),
      hasSallaStoreUrl: Boolean(merchant.sallaStoreUrl),
      hasZidToken: Boolean(merchant.zidAccessToken),
      hasSallaToken: Boolean(merchant.sallaAccessToken),
    });

    if (!zidConnected && !isSallaConnected) {
      return NextResponse.json(
        {
          error: "Store not connected",
          message: "Please connect your Zid or Salla store first",
        },
        { status: 400 }
      );
    }

    // Atomic concurrency lock: Try to acquire sync by updating lastSyncAt
    const fiveMinutesInMs = 5 * 60 * 1000;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - fiveMinutesInMs);

    const acquiredLock = await prisma.merchant.updateMany({
      where: {
        id: merchantId,
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: fiveMinutesAgo } },
        ],
      },
      data: { lastSyncAt: now },
    });

    if (acquiredLock.count === 0) {
      // Lock acquisition failed - another sync is in progress or rate limited
      const currentMerchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { lastSyncAt: true },
      });

      if (currentMerchant?.lastSyncAt) {
        const timeSinceLastSync =
          Date.now() - currentMerchant.lastSyncAt.getTime();
        const waitTime = Math.ceil(
          (fiveMinutesInMs - timeSinceLastSync) / 1000 / 60
        );
        debugSyncLog("sync-lock-rejected", {
          merchantId,
          lastSyncAt: currentMerchant.lastSyncAt.toISOString(),
          waitTimeMinutes: waitTime,
        });
        return NextResponse.json(
          {
            error: "Sync in progress or rate limited",
            message: `Please wait ${waitTime} minute(s) before syncing again`,
            lastSyncAt: currentMerchant.lastSyncAt,
          },
          { status: 429 }
        );
      }
    }

    const platform =
      requestedPlatform === "salla" || requestedPlatform === "zid"
        ? requestedPlatform
        : zidConnected
        ? "zid"
        : "salla";
    debugSyncLog("platform-selected", {
      platform,
      requestedPlatform,
      isZidConnected: zidConnected,
      isSallaConnected,
    });

    if (platform === "zid" && !zidConnected) {
      const missingFields = getMissingZidConnectionFields(merchant);
      debugSyncLog("zid-connection-missing", {
        merchantId,
        missingFields,
      });
      // Release lock by reverting lastSyncAt
      await prisma.merchant.update({
        where: { id: merchantId },
        data: { lastSyncAt: merchant.lastSyncAt },
      });
      debugSyncLog("sync-aborted", {
        reason: "zid-not-connected",
        merchantId,
      });
      const missingLabel = missingFields.length
        ? `: missing ${missingFields.join(", ")}`
        : "";
      return NextResponse.json(
        {
          error: `Zid is not fully connected${missingLabel}`,
          missingFields,
        },
        { status: 400 }
      );
    }

    if (platform === "salla" && !isSallaConnected) {
      // Release lock by reverting lastSyncAt
      await prisma.merchant.update({
        where: { id: merchantId },
        data: { lastSyncAt: merchant.lastSyncAt },
      });
      debugSyncLog("sync-aborted", {
        reason: "salla-not-connected",
        merchantId,
      });
      return NextResponse.json(
        { error: "Salla store not connected" },
        { status: 400 }
      );
    }

    const storeUrl =
      platform === "zid" ? merchant.zidStoreUrl : merchant.sallaStoreUrl;

    const safeNumber = (value: number | undefined | null) =>
      typeof value === "number" && Number.isFinite(value) ? value : 0;

    const previousLastSyncAt = merchant.lastSyncAt;
    let syncSummary:
      | {
          productsCreated?: number;
          productsUpdated?: number;
          categoriesCreated?: number;
          categoriesUpdated?: number;
          syncedCount?: number;
          pagesFetched?: number;
          ordersSeen?: number;
          ordersUpserted?: number;
          ordersWithProductMatch?: number;
          ordersPagesFetched?: number;
        }
      | undefined;

    try {
      // Lock already acquired above via updateMany

      debugSyncLog("sync-start", {
        merchantId,
        platform,
        storeUrl: storeUrl || null,
      });
      if (platform === "zid") {
        const ordering =
          body?.ordering === "created_at" || body?.ordering === "updated_at"
            ? body.ordering
            : undefined;
        const categorySummary = await syncZidCategories(merchant.id);
        const productSummary = await syncZidProducts(merchant.id, {
          ordering,
        });
        syncSummary = {
          productsCreated: productSummary.createdCount,
          productsUpdated: productSummary.updatedCount,
          categoriesCreated: categorySummary.createdCount,
          categoriesUpdated: categorySummary.updatedCount,
          syncedCount: productSummary.syncedCount,
          pagesFetched: productSummary.pagesFetched,
        };
      } else {
        await syncSallaStoreInfo(merchant.id);
        const sallaResult = await syncSallaProductsForMerchant(merchant.id);
        const ordersResult = syncOrders
          ? await syncSallaOrdersForMerchant(merchant.id, {
              fromDate: body?.fromDate,
              toDate: body?.toDate,
            })
          : null;
        syncSummary = {
          productsCreated: sallaResult.createdCount,
          productsUpdated: sallaResult.updatedCount,
          categoriesCreated: 0,
          categoriesUpdated: 0,
          syncedCount: sallaResult.syncedCount,
          pagesFetched: sallaResult.pagesFetched,
          ordersSeen: ordersResult?.ordersSeen,
          ordersUpserted: ordersResult?.ordersUpserted,
          ordersWithProductMatch: ordersResult?.ordersWithProductMatch,
          ordersPagesFetched: ordersResult?.pagesFetched,
        };
      }

      await prisma.merchant.update({
        where: { id: merchantId },
        data: { lastSyncAt: new Date() },
      });
      debugSyncLog("sync-complete", {
        merchantId,
        platform,
        summary: syncSummary || null,
      });
    } catch (error) {
      await prisma.merchant.update({
        where: { id: merchantId },
        data: { lastSyncAt: previousLastSyncAt },
      });
      debugSyncLog("sync-error", {
        merchantId,
        platform,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }

    const summary = {
      productsCreated: safeNumber(syncSummary?.productsCreated),
      productsUpdated: safeNumber(syncSummary?.productsUpdated),
      categoriesCreated: safeNumber(syncSummary?.categoriesCreated),
      categoriesUpdated: safeNumber(syncSummary?.categoriesUpdated),
      syncedCount: safeNumber(syncSummary?.syncedCount),
      pagesFetched: safeNumber(syncSummary?.pagesFetched),
      ordersSeen: safeNumber(syncSummary?.ordersSeen),
      ordersUpserted: safeNumber(syncSummary?.ordersUpserted),
      ordersWithProductMatch: safeNumber(syncSummary?.ordersWithProductMatch),
      ordersPagesFetched: safeNumber(syncSummary?.ordersPagesFetched),
    };

    const syncResult = {
      status: "success",
      message: "Product sync initiated",
      platform,
      merchantId: merchant.id,
      merchantName: merchant.name,
      storeUrl,
      syncedAt: new Date().toISOString(),
      summary: {
        productsChecked: summary.productsCreated + summary.productsUpdated,
        productsCreated: summary.productsCreated,
        productsUpdated: summary.productsUpdated,
        categoriesChecked: summary.categoriesCreated + summary.categoriesUpdated,
        categoriesCreated: summary.categoriesCreated,
        categoriesUpdated: summary.categoriesUpdated,
        syncedCount: summary.syncedCount,
        pagesFetched: summary.pagesFetched,
        ordersSeen: summary.ordersSeen,
        ordersUpserted: summary.ordersUpserted,
        ordersWithProductMatch: summary.ordersWithProductMatch,
        ordersPagesFetched: summary.ordersPagesFetched,
      },
    };

    return NextResponse.json(syncResult);
  } catch (error) {
    console.error("Error triggering product sync:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to trigger product sync";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  void _request;
  try {
    const auth = await requireMerchant("api");
    if ("response" in auth) return auth.response;
    const { session } = auth;
    const merchantId = session.user.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        { error: "Merchant profile not linked" },
        { status: 403 }
      );
    }

    const merchant = await prisma.merchant.findFirst({
      where: { id: merchantId, userId: session.user.id },
      select: {
        id: true,
        lastSyncAt: true,
        autoSyncProducts: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    let timeSinceSync = null;
    if (merchant.lastSyncAt) {
      const diffMs = Date.now() - merchant.lastSyncAt.getTime();
      const diffMins = Math.floor(diffMs / 1000 / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        timeSinceSync = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      } else if (diffHours > 0) {
        timeSinceSync = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      } else if (diffMins > 0) {
        timeSinceSync = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      } else {
        timeSinceSync = "Just now";
      }
    }

    return NextResponse.json({
      merchantId: merchant.id,
      lastSyncAt: merchant.lastSyncAt,
      timeSinceSync,
      autoSyncEnabled: merchant.autoSyncProducts,
      totalProducts: merchant._count.products,
      canSyncNow: merchant.lastSyncAt
        ? Date.now() - merchant.lastSyncAt.getTime() > 5 * 60 * 1000
        : true,
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}
