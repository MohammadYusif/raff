// src/app/api/admin/alerts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth/admin-guard";

interface Alert {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  action?: {
    label: string;
    href?: string;
  };
}

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const alerts: Alert[] = [];

    // Check for pending merchants
    const pendingMerchants = await prisma.merchant.count({
      where: { status: "PENDING" },
    });

    if (pendingMerchants > 0) {
      alerts.push({
        id: "pending-merchants",
        type: "warning",
        title: "Pending Approvals",
        message: `${pendingMerchants} merchant(s) waiting for approval`,
        timestamp: now.toISOString(),
        action: {
          label: "Review",
          href: "/admin/merchants?status=pending",
        },
      });
    }

    // Check for merchants with missing tokens (need re-auth)
    const missingTokenMerchants = await prisma.merchant.count({
      where: {
        status: "APPROVED",
        isActive: true,
        OR: [
          {
            sallaStoreId: { not: null },
            sallaAccessToken: null,
          },
          {
            zidStoreId: { not: null },
            zidAccessToken: null,
          },
        ],
      },
    });

    if (missingTokenMerchants > 0) {
      alerts.push({
        id: "missing-tokens",
        type: "error",
        title: "OAuth Tokens Missing",
        message: `${missingTokenMerchants} merchant(s) need to re-authenticate`,
        timestamp: now.toISOString(),
      });
    }

    // Check for merchants who haven't synced in over 24 hours
    const staleMerchants = await prisma.merchant.count({
      where: {
        status: "APPROVED",
        isActive: true,
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: last24h } },
        ],
      },
    });

    if (staleMerchants > 5) {
      alerts.push({
        id: "stale-syncs",
        type: "warning",
        title: "Stale Product Data",
        message: `${staleMerchants} merchant(s) haven't synced in 24+ hours`,
        timestamp: now.toISOString(),
      });
    }

    // Check for products with no images (using 'images' array field)
    const productsNoImages = await prisma.product.count({
      where: {
        isActive: true,
        images: { isEmpty: true },
        thumbnail: null,
      },
    });

    if (productsNoImages > 10) {
      alerts.push({
        id: "products-no-images",
        type: "info",
        title: "Products Missing Images",
        message: `${productsNoImages} active products have no images`,
        timestamp: now.toISOString(),
      });
    }

    // Check for low conversion rate
    const [clicks, orders] = await Promise.all([
      prisma.clickTracking.count({
        where: { clickedAt: { gte: last24h } },
      }),
      prisma.order.count({
        where: { createdAt: { gte: last24h } },
      }),
    ]);

    if (clicks > 100 && orders === 0) {
      alerts.push({
        id: "low-conversion",
        type: "warning",
        title: "Low Conversion Rate",
        message: `${clicks} clicks but no orders in the last 24 hours`,
        timestamp: now.toISOString(),
      });
    }

    // Sort alerts by type priority (error > warning > info)
    const typePriority = { error: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => typePriority[a.type] - typePriority[b.type]);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
