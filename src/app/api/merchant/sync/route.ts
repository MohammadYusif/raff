// src/app/api/merchant/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncZidProducts } from "@/lib/services/zid.service";
import { syncSallaProducts } from "@/lib/services/salla.service";
import { requireMerchant } from "@/lib/auth/guards";

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

    const isZidConnected = !!merchant.zidAccessToken;
    const isSallaConnected = !!merchant.sallaAccessToken;

    debugSyncLog("connection-status", {
      isZidConnected,
      isSallaConnected,
      hasZidStoreId: Boolean(merchant.zidStoreId),
      hasZidStoreUrl: Boolean(merchant.zidStoreUrl),
      hasSallaStoreId: Boolean(merchant.sallaStoreId),
      hasSallaStoreUrl: Boolean(merchant.sallaStoreUrl),
      hasZidToken: Boolean(merchant.zidAccessToken),
      hasSallaToken: Boolean(merchant.sallaAccessToken),
    });

    if (!isZidConnected && !isSallaConnected) {
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
        : isZidConnected
        ? "zid"
        : "salla";
    debugSyncLog("platform-selected", {
      platform,
      requestedPlatform,
      isZidConnected,
      isSallaConnected,
    });

    if (platform === "zid" && !isZidConnected) {
      // Release lock by reverting lastSyncAt
      await prisma.merchant.update({
        where: { id: merchantId },
        data: { lastSyncAt: merchant.lastSyncAt },
      });
      debugSyncLog("sync-aborted", {
        reason: "zid-not-connected",
        merchantId,
      });
      return NextResponse.json(
        { error: "Zid store not connected" },
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
        }
      | undefined;

    try {
      // Lock already acquired above via updateMany

      debugSyncLog("sync-start", {
        merchantId,
        platform,
        storeUrl: storeUrl || null,
      });
      syncSummary =
        platform === "zid"
          ? await syncZidProducts({
              id: merchant.id,
              zidAccessToken: merchant.zidAccessToken,
              zidRefreshToken: merchant.zidRefreshToken,
              zidTokenExpiry: merchant.zidTokenExpiry,
              zidManagerToken: merchant.zidManagerToken,
              zidStoreId: merchant.zidStoreId,
              zidStoreUrl: merchant.zidStoreUrl,
            })
          : await syncSallaProducts({
              id: merchant.id,
              sallaAccessToken: merchant.sallaAccessToken,
              sallaRefreshToken: merchant.sallaRefreshToken,
              sallaTokenExpiry: merchant.sallaTokenExpiry,
              sallaStoreId: merchant.sallaStoreId,
              sallaStoreUrl: merchant.sallaStoreUrl,
            });

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
      },
    };

    return NextResponse.json(syncResult);
  } catch (error) {
    console.error("Error triggering product sync:", error);
    return NextResponse.json(
      { error: "Failed to trigger product sync" },
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
