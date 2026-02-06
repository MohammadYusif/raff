// src/app/api/admin/merchant-resync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncSallaProductsForMerchant } from "@/lib/sync/sallaProducts";
import { syncSallaOrdersForMerchant } from "@/lib/sync/sallaOrders";
import { syncSallaStoreInfo } from "@/lib/sync/sallaStore";
import { syncZidCategories, syncZidProducts } from "@/lib/sync/zidProducts";
import { isZidConnected } from "@/lib/zid/isZidConnected";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-admin-merchant-resync");


type ResyncBody = {
  merchantId?: string;
  ordersBackfillDays?: number | null;
};

const MAX_BACKFILL_DAYS = 180;

function parseBackfillDays(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.min(Math.trunc(num), MAX_BACKFILL_DAYS);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isDev = process.env.NODE_ENV !== "production";
    const isAdmin = session.user.role === UserRole.ADMIN;
    if (!isAdmin && !isDev) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as ResyncBody | null;
    const merchantId = body?.merchantId ?? "";
    if (!merchantId) {
      return NextResponse.json(
        { error: "Missing merchantId" },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        sallaAccessToken: true,
        sallaRefreshToken: true,
        sallaTokenExpiry: true,
        sallaStoreId: true,
        sallaStoreUrl: true,
        zidAccessToken: true,
        zidRefreshToken: true,
        zidTokenExpiry: true,
        zidStoreId: true,
        zidStoreUrl: true,
        zidManagerToken: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const ordersBackfillDays = parseBackfillDays(body?.ordersBackfillDays);
    const fromDate = ordersBackfillDays
      ? new Date(Date.now() - ordersBackfillDays * 24 * 60 * 60 * 1000)
      : null;

    const results: Record<string, unknown> = {};

    if (merchant.sallaAccessToken) {
      await syncSallaStoreInfo(merchant.id);
      const productsResult = await syncSallaProductsForMerchant(merchant.id);
      results.sallaProducts = productsResult;

      if (fromDate) {
        const ordersResult = await syncSallaOrdersForMerchant(merchant.id, {
          fromDate: fromDate.toISOString(),
        });
        results.sallaOrders = ordersResult;
      }
    }

    if (isZidConnected(merchant)) {
      const zidCategories = await syncZidCategories(merchant.id);
      const zidProducts = await syncZidProducts(merchant.id, {
        ordering: "updated_at",
      });
      results.zidCategories = zidCategories;
      results.zidProducts = zidProducts;
    }

    return NextResponse.json({
      success: true,
      merchantId,
      ordersBackfillDays,
      results,
    });
  } catch (error) {
    logger.error("Admin merchant resync failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to resync merchant" },
      { status: 500 }
    );
  }
}
