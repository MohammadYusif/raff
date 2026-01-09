// src/app/api/merchant/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.MERCHANT) {
      return NextResponse.json(
        { error: "Unauthorized - Merchant access required" },
        { status: 401 }
      );
    }

    const merchantId = session.user.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        { error: "No merchant associated with this account" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";

    // Calculate date range
    const now = new Date();
    const daysAgo = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Get current period stats
    const [currentClicks, currentOrders, currentProductStats] = await Promise.all([
      prisma.clickTracking.count({
        where: {
          merchantId,
          clickedAt: { gte: startDate },
        },
      }),
      prisma.order.findMany({
        where: {
          merchantId,
          createdAt: { gte: startDate },
        },
        select: {
          totalPrice: true,
        },
      }),
      prisma.product.aggregate({
        where: { merchantId },
        _sum: {
          viewCount: true,
        },
      }),
    ]);

    const currentViews = currentProductStats._sum.viewCount || 0;
    const currentRevenue = currentOrders.reduce(
      (sum, order) => sum + Number(order.totalPrice),
      0
    );

    // Get previous period stats
    // Note: Views are cumulative, so we calculate previous period views differently
    const [previousClicks, previousOrders] = await Promise.all([
      prisma.clickTracking.count({
        where: {
          merchantId,
          clickedAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
      }),
      prisma.order.findMany({
        where: {
          merchantId,
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
        select: {
          totalPrice: true,
        },
      }),
    ]);

    // For views, estimate previous period by checking trending logs
    // Get product IDs for this merchant
    const merchantProductIds = await prisma.product.findMany({
      where: { merchantId },
      select: { id: true },
    });

    const productIds = merchantProductIds.map((p) => p.id);

    const previousViewLogs = await prisma.trendingLog.count({
      where: {
        eventType: "VIEW",
        createdAt: {
          gte: previousStartDate,
          lt: startDate,
        },
        productId: { in: productIds },
      },
    });

    const previousViews = previousViewLogs;
    const previousRevenue = previousOrders.reduce(
      (sum, order) => sum + Number(order.totalPrice),
      0
    );

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Get top products
    const products = await prisma.product.findMany({
      where: {
        merchantId,
      },
      select: {
        id: true,
        title: true,
        titleAr: true,
        clickTrackings: {
          where: {
            clickedAt: { gte: startDate },
          },
          select: {
            id: true,
          },
        },
        outboundClickEvents: {
          where: {
            createdAt: { gte: startDate },
          },
          select: {
            id: true,
          },
        },
        orders: {
          where: {
            createdAt: { gte: startDate },
          },
          select: {
            totalPrice: true,
          },
        },
      },
      take: 10,
    });

    const topProducts = products
      .map((product) => ({
        id: product.id,
        name: product.title,
        nameAr: product.titleAr || product.title,
        views: product.clickTrackings.length,
        clicks: product.outboundClickEvents.length,
        orders: product.orders.length,
        revenue: product.orders.reduce((sum, order) => sum + Number(order.totalPrice), 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Get traffic sources
    const clicks = await prisma.clickTracking.findMany({
      where: {
        merchantId,
        clickedAt: { gte: startDate },
      },
      select: {
        referrerUrl: true,
        productId: true,
      },
    });

    const sourceMap = new Map<string, { visits: number; productIds: Set<string> }>();
    clicks.forEach((click) => {
      const source = click.referrerUrl
        ? new URL(click.referrerUrl).hostname.replace("www.", "")
        : "direct";
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { visits: 0, productIds: new Set() });
      }
      const data = sourceMap.get(source)!;
      data.visits++;
      data.productIds.add(click.productId);
    });

    const trafficSources = await Promise.all(
      Array.from(sourceMap.entries()).map(async ([source, data]) => {
        const orders = await prisma.order.findMany({
          where: {
            merchantId,
            productId: { in: Array.from(data.productIds) },
            createdAt: { gte: startDate },
          },
          select: {
            totalPrice: true,
          },
        });

        return {
          source,
          visits: data.visits,
          conversions: orders.length,
          revenue: orders.reduce((sum, order) => sum + Number(order.totalPrice), 0),
        };
      })
    );

    // Generate simple daily stats
    const dailyStats: Array<{ date: string; views: number; clicks: number; orders: number }> = [];
    for (let i = 0; i < Math.min(daysAgo, 30); i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const [dayViews, dayClicks, dayOrders] = await Promise.all([
        prisma.trendingLog.count({
          where: {
            eventType: "VIEW",
            createdAt: { gte: dayStart, lte: dayEnd },
            productId: { in: productIds },
          },
        }),
        prisma.clickTracking.count({
          where: {
            merchantId,
            clickedAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.order.count({
          where: {
            merchantId,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      dailyStats.push({
        date: dayStart.toISOString(),
        views: dayViews,
        clicks: dayClicks,
        orders: dayOrders,
      });
    }

    return NextResponse.json({
      overview: {
        totalViews: currentViews,
        totalClicks: currentClicks,
        totalOrders: currentOrders.length,
        totalRevenue: currentRevenue,
        viewsGrowth: calculateGrowth(currentViews, previousViews),
        clicksGrowth: calculateGrowth(currentClicks, previousClicks),
        ordersGrowth: calculateGrowth(currentOrders.length, previousOrders.length),
        revenueGrowth: calculateGrowth(currentRevenue, previousRevenue),
        avgCTR: currentViews > 0 ? (currentClicks / currentViews) * 100 : 0,
        avgConversion: currentClicks > 0 ? (currentOrders.length / currentClicks) * 100 : 0,
      },
      topProducts,
      trafficSources: trafficSources.sort((a, b) => b.revenue - a.revenue),
      dailyStats: dailyStats.reverse(),
    });
  } catch (error) {
    console.error("Error fetching merchant analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
