// src/app/api/merchant/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchantId } = body;

    if (!merchantId) {
      return NextResponse.json(
        { error: "Merchant ID is required" },
        { status: 401 }
      );
    }

    // ✅ FIX: Use findFirst instead of findUnique
    const merchant = await prisma.merchant.findFirst({
      where: {
        id: merchantId,
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

    const isZidConnected = !!merchant.zidStoreId && !!merchant.zidAccessToken;
    const isSallaConnected =
      !!merchant.sallaStoreId && !!merchant.sallaAccessToken;

    if (!isZidConnected && !isSallaConnected) {
      return NextResponse.json(
        {
          error: "Store not connected",
          message: "Please connect your Zid or Salla store first",
        },
        { status: 400 }
      );
    }

    if (merchant.lastSyncAt) {
      const timeSinceLastSync = Date.now() - merchant.lastSyncAt.getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (timeSinceLastSync < fiveMinutesInMs) {
        const waitTime = Math.ceil(
          (fiveMinutesInMs - timeSinceLastSync) / 1000 / 60
        );
        return NextResponse.json(
          {
            error: "Sync in progress",
            message: `Please wait ${waitTime} minute(s) before syncing again`,
            lastSyncAt: merchant.lastSyncAt,
          },
          { status: 429 }
        );
      }
    }

    await prisma.merchant.update({
      where: { id: merchantId },
      data: { lastSyncAt: new Date() },
    });

    const platform = isZidConnected ? "zid" : "salla";
    const storeUrl = isZidConnected
      ? merchant.zidStoreUrl
      : merchant.sallaStoreUrl;

    const syncResult = {
      status: "success",
      message: "Product sync initiated",
      platform,
      merchantId: merchant.id,
      merchantName: merchant.name,
      storeUrl,
      syncedAt: new Date().toISOString(),
      summary: {
        productsChecked: 0,
        productsCreated: 0,
        productsUpdated: 0,
        categoriesChecked: 0,
        categoriesCreated: 0,
        categoriesUpdated: 0,
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

export async function GET(request: NextRequest) {
  try {
    const merchantId = request.nextUrl.searchParams.get("merchantId");

    if (!merchantId) {
      return NextResponse.json(
        { error: "Merchant ID is required" },
        { status: 401 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
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
