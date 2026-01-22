// src/app/api/admin/health/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth/admin-guard";

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check database health
    let databaseStatus: "healthy" | "degraded" | "down" = "healthy";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = "down";
    }

    // Check for recent sync activity to determine API health
    const [
      lastSallaSyncMerchant,
      lastZidSyncMerchant,
      pendingMerchants,
    ] = await Promise.all([
      prisma.merchant.findFirst({
        where: {
          sallaStoreId: { not: null },
          lastSyncAt: { not: null },
        },
        orderBy: { lastSyncAt: "desc" },
        select: { lastSyncAt: true },
      }),
      prisma.merchant.findFirst({
        where: {
          zidStoreId: { not: null },
          lastSyncAt: { not: null },
        },
        orderBy: { lastSyncAt: "desc" },
        select: { lastSyncAt: true },
      }),
      prisma.merchant.count({
        where: { status: "PENDING" },
      }),
    ]);

    // Count failed syncs and OAuth errors from logs
    // We'll check if there are recent errors in our log patterns
    const recentLogs = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "TrendingLog"
      WHERE "createdAt" >= ${last24h}
      AND "eventType" = 'ERROR'
    `.catch(() => [{ count: BigInt(0) }]);

    const failedSyncsLast24h = Number(recentLogs[0]?.count || 0);

    // Determine API health based on last sync times
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    let sallaApiStatus: "healthy" | "degraded" | "down" = "healthy";
    if (!lastSallaSyncMerchant?.lastSyncAt) {
      sallaApiStatus = "degraded";
    } else if (lastSallaSyncMerchant.lastSyncAt < oneHourAgo) {
      sallaApiStatus = "degraded";
    }

    let zidApiStatus: "healthy" | "degraded" | "down" = "healthy";
    if (!lastZidSyncMerchant?.lastSyncAt) {
      zidApiStatus = "degraded";
    } else if (lastZidSyncMerchant.lastSyncAt < oneHourAgo) {
      zidApiStatus = "degraded";
    }

    return NextResponse.json({
      database: databaseStatus,
      sallaApi: sallaApiStatus,
      zidApi: zidApiStatus,
      lastSyncSalla: lastSallaSyncMerchant?.lastSyncAt?.toISOString() || null,
      lastSyncZid: lastZidSyncMerchant?.lastSyncAt?.toISOString() || null,
      failedSyncsLast24h,
      oauthErrorsLast24h: 0, // Would need to track OAuth errors separately
      pendingMerchants,
    });
  } catch (error) {
    console.error("Error fetching system health:", error);
    return NextResponse.json(
      { error: "Failed to fetch system health" },
      { status: 500 }
    );
  }
}
