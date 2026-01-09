// src/app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth/admin-guard";

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";

    // Calculate date range
    const now = new Date();
    const daysAgo = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Get platform-wide statistics
    const [
      totalMerchants,
      activeMerchants,
      pendingMerchants,
      totalProducts,
      activeProducts,
      totalUsers,
      currentOrders,
      previousOrders,
      currentRevenue,
      previousRevenue,
      currentClicks,
      previousClicks,
      currentViews,
      previousViews,
    ] = await Promise.all([
      // Merchants
      prisma.merchant.count(),
      prisma.merchant.count({
        where: {
          status: "APPROVED",
          isActive: true,
        },
      }),
      prisma.merchant.count({
        where: { status: "PENDING" },
      }),

      // Products
      prisma.product.count(),
      prisma.product.count({
        where: {
          isActive: true,
          inStock: true,
        },
      }),

      // Users
      prisma.user.count(),

      // Orders (current period)
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          totalPrice: true,
        },
      }),

      // Orders (previous period)
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
        select: {
          totalPrice: true,
        },
      }),

      // Revenue (current period)
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
        },
        _sum: {
          totalPrice: true,
        },
      }),

      // Revenue (previous period)
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
        _sum: {
          totalPrice: true,
        },
      }),

      // Clicks (current period)
      prisma.clickTracking.count({
        where: {
          clickedAt: { gte: startDate },
        },
      }),

      // Clicks (previous period)
      prisma.clickTracking.count({
        where: {
          clickedAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
      }),

      // Views (current period)
      prisma.trendingLog.count({
        where: {
          eventType: "VIEW",
          createdAt: { gte: startDate },
        },
      }),

      // Views (previous period)
      prisma.trendingLog.count({
        where: {
          eventType: "VIEW",
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
      }),
    ]);

    const currentRevenueValue = Number(currentRevenue._sum.totalPrice || 0);
    const previousRevenueValue = Number(previousRevenue._sum.totalPrice || 0);

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Get top merchants by revenue
    const topMerchants = await prisma.merchant.findMany({
      where: {
        status: "APPROVED",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        orders: {
          where: {
            createdAt: { gte: startDate },
          },
          select: {
            totalPrice: true,
          },
        },
        products: {
          select: {
            id: true,
          },
        },
        clickTrackings: {
          where: {
            clickedAt: { gte: startDate },
          },
          select: {
            id: true,
          },
        },
      },
      take: 10,
    });

    const topMerchantsData = topMerchants
      .map((merchant) => ({
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        products: merchant.products.length,
        clicks: merchant.clickTrackings.length,
        orders: merchant.orders.length,
        revenue: merchant.orders.reduce(
          (sum, order) => sum + Number(order.totalPrice),
          0
        ),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Get daily stats for charts
    const dailyStats: Array<{
      date: string;
      merchants: number;
      users: number;
      products: number;
      orders: number;
      revenue: number;
      clicks: number;
      views: number;
    }> = [];

    for (let i = 0; i < Math.min(daysAgo, 30); i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const [
        dayMerchants,
        dayUsers,
        dayProducts,
        dayOrders,
        dayRevenue,
        dayClicks,
        dayViews,
      ] = await Promise.all([
        prisma.merchant.count({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.product.count({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.order.findMany({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
          },
          select: {
            totalPrice: true,
          },
        }),
        prisma.order.aggregate({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
          },
          _sum: {
            totalPrice: true,
          },
        }),
        prisma.clickTracking.count({
          where: {
            clickedAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.trendingLog.count({
          where: {
            eventType: "VIEW",
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      dailyStats.push({
        date: dayStart.toISOString(),
        merchants: dayMerchants,
        users: dayUsers,
        products: dayProducts,
        orders: dayOrders.length,
        revenue: Number(dayRevenue._sum.totalPrice || 0),
        clicks: dayClicks,
        views: dayViews,
      });
    }

    // Platform distribution
    const platformDistribution = await prisma.merchant.groupBy({
      by: ["sallaStoreId", "zidStoreId"],
      _count: true,
      where: {
        status: "APPROVED",
        isActive: true,
      },
    });

    const sallaMerchants = platformDistribution.filter((p) => p.sallaStoreId !== null).reduce((sum, p) => sum + p._count, 0);
    const zidMerchants = platformDistribution.filter((p) => p.zidStoreId !== null).reduce((sum, p) => sum + p._count, 0);

    // Click quality stats
    const [qualifiedClicks, totalClickEvents, disqualifiedReasons] = await Promise.all([
      prisma.outboundClickEvent.count({
        where: {
          qualified: true,
          createdAt: { gte: startDate },
        },
      }),
      prisma.outboundClickEvent.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
      prisma.outboundClickEvent.groupBy({
        by: ["disqualifyReason"],
        where: {
          qualified: false,
          createdAt: { gte: startDate },
          disqualifyReason: { not: null },
        },
        _count: true,
      }),
    ]);

    const clickQualityRate = totalClickEvents > 0 ? (qualifiedClicks / totalClickEvents) * 100 : 0;

    return NextResponse.json({
      overview: {
        totalMerchants,
        activeMerchants,
        pendingMerchants,
        merchantsGrowth: calculateGrowth(activeMerchants, totalMerchants - activeMerchants),
        totalProducts,
        activeProducts,
        productsGrowth: calculateGrowth(activeProducts, totalProducts - activeProducts),
        totalUsers,
        totalOrders: currentOrders.length,
        ordersGrowth: calculateGrowth(currentOrders.length, previousOrders.length),
        totalRevenue: currentRevenueValue,
        revenueGrowth: calculateGrowth(currentRevenueValue, previousRevenueValue),
        totalClicks: currentClicks,
        clicksGrowth: calculateGrowth(currentClicks, previousClicks),
        totalViews: currentViews,
        viewsGrowth: calculateGrowth(currentViews, previousViews),
        avgCTR: currentViews > 0 ? (currentClicks / currentViews) * 100 : 0,
        avgConversion: currentClicks > 0 ? (currentOrders.length / currentClicks) * 100 : 0,
        currency: "SAR",
      },
      platformDistribution: {
        salla: sallaMerchants,
        zid: zidMerchants,
        total: sallaMerchants + zidMerchants,
      },
      clickQuality: {
        qualifiedClicks,
        totalClickEvents,
        qualityRate: clickQualityRate,
        disqualifiedReasons: disqualifiedReasons.map((r) => ({
          reason: r.disqualifyReason,
          count: r._count,
        })),
      },
      topMerchants: topMerchantsData,
      dailyStats: dailyStats.reverse(),
      period: {
        days: daysAgo,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
