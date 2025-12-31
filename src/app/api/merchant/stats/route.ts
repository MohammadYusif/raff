// src/app/api/merchant/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
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

    const daysParam = request.nextUrl.searchParams.get("days");
    let daysBack = parseInt(daysParam || "30", 10);

    if (!Number.isFinite(daysBack) || daysBack <= 0) {
      daysBack = 30;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const merchant = await prisma.merchant.findFirst({
      where: {
        id: merchantId,
        userId: session.user.id,
        status: "APPROVED",
        isActive: true,
      },
      select: { id: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found or not approved" },
        { status: 404 }
      );
    }

    const [
      totalProducts,
      activeProducts,
      totalOrders,
      recentOrders,
      productStats,
      topProducts,
    ] = await Promise.all([
      prisma.product.count({
        where: { merchantId },
      }),

      prisma.product.count({
        where: {
          merchantId,
          isActive: true,
          inStock: true,
        },
      }),

      prisma.order.count({
        where: {
          product: { merchantId },
        },
      }),

      prisma.order.count({
        where: {
          product: { merchantId },
          createdAt: { gte: startDate },
        },
      }),

      prisma.product.aggregate({
        where: { merchantId },
        _sum: {
          viewCount: true,
          clickCount: true,
          orderCount: true,
        },
      }),

      prisma.product.findMany({
        where: {
          merchantId,
          isActive: true,
        },
        orderBy: [{ trendingScore: "desc" }, { orderCount: "desc" }],
        take: 5,
        select: {
          id: true,
          title: true,
          titleAr: true,
          slug: true,
          viewCount: true,
          clickCount: true,
          orderCount: true,
          trendingScore: true,
          price: true,
          thumbnail: true,
        },
      }),
    ]);

    const revenueData = await prisma.order.aggregate({
      where: {
        product: { merchantId },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const recentRevenueData = await prisma.order.aggregate({
      where: {
        product: { merchantId },
        createdAt: { gte: startDate },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const totalRevenue = revenueData._sum.totalPrice || 0;
    const recentRevenue = recentRevenueData._sum.totalPrice || 0;

    const totalViews = productStats._sum.viewCount || 0;
    const totalClicks = productStats._sum.clickCount || 0;
    const totalOrderCount = productStats._sum.orderCount || 0;

    const conversionRate =
      totalClicks > 0
        ? ((totalOrderCount / totalClicks) * 100).toFixed(2)
        : "0.00";

    const clickThroughRate =
      totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : "0.00";

    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - daysBack);

    const previousOrders = await prisma.order.count({
      where: {
        product: { merchantId },
        createdAt: {
          gte: previousStartDate,
          lt: startDate,
        },
      },
    });

    const previousRevenue = await prisma.order.aggregate({
      where: {
        product: { merchantId },
        createdAt: {
          gte: previousStartDate,
          lt: startDate,
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const ordersGrowth =
      previousOrders > 0
        ? (((recentOrders - previousOrders) / previousOrders) * 100).toFixed(1)
        : "0.0";

    const revenueGrowth =
      (previousRevenue._sum.totalPrice || 0) > 0
        ? (
            ((recentRevenue - (previousRevenue._sum.totalPrice || 0)) /
              (previousRevenue._sum.totalPrice || 0)) *
            100
          ).toFixed(1)
        : "0.0";

    return NextResponse.json({
      stats: {
        totalProducts,
        activeProducts,
        outOfStock: totalProducts - activeProducts,
        totalViews,
        totalClicks,
        clickThroughRate: parseFloat(clickThroughRate),
        totalOrders,
        recentOrders,
        ordersGrowth: parseFloat(ordersGrowth),
        totalRevenue,
        recentRevenue,
        revenueGrowth: parseFloat(revenueGrowth),
        currency: "SAR",
        conversionRate: parseFloat(conversionRate),
        topProducts: topProducts.map((product) => ({
          id: product.id,
          title: product.title,
          titleAr: product.titleAr,
          slug: product.slug,
          views: product.viewCount,
          clicks: product.clickCount,
          orders: product.orderCount,
          trendingScore: product.trendingScore,
          price: product.price,
          thumbnail: product.thumbnail,
        })),
      },
      period: {
        days: daysBack,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching merchant stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch merchant statistics" },
      { status: 500 }
    );
  }
}
