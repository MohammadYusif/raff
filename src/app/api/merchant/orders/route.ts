// src/app/api/merchant/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMerchant("api");
    if ("response" in auth) return auth.response;
    const { session } = auth;
    const merchantId = session.user.merchantId;

    if (!merchantId) {
      return NextResponse.json(
        { error: "Merchant ID not found" },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 10));
    const status = searchParams.get("status") as OrderStatus | null;

    // Build where clause
    const where: { merchantId: string; status?: OrderStatus } = { merchantId };
    if (status && Object.values(OrderStatus).includes(status)) {
      where.status = status;
    }

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where });
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            images: true,
            price: true,
            currency: true,
          },
        },
        clickTracking: {
          select: {
            id: true,
            trackingId: true,
            referrerUrl: true,
            platform: true,
          },
        },
      },
    });

    // Fetch commissions for these orders
    const orderIds = orders.map((o) => o.id);
    const commissions = await prisma.commission.findMany({
      where: {
        merchantId,
        orderId: { in: orderIds },
      },
      select: {
        id: true,
        orderId: true,
        commissionAmount: true,
        status: true,
        commissionRate: true,
      },
    });

    // Create a map of orderId -> commission
    const commissionMap = new Map(commissions.map((c) => [c.orderId, c]));

    // Calculate summary statistics
    const stats = await prisma.order.aggregate({
      where: { merchantId },
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
    });

    const totalRevenue = Number(stats._sum.totalPrice || 0);
    const totalOrders = stats._count.id;

    // Calculate total commissions
    const commissionStats = await prisma.commission.aggregate({
      where: {
        merchantId,
        status: "APPROVED",
      },
      _sum: {
        commissionAmount: true,
      },
    });

    const totalCommissions = Number(commissionStats._sum?.commissionAmount || 0);

    // Format orders for response
    const formattedOrders = orders.map((order) => {
      const commission = commissionMap.get(order.id);

      return {
        id: order.id,
        orderNumber: order.zidOrderId || order.sallaOrderId || null,
        platform: order.zidOrderId ? "ZID" : order.sallaOrderId ? "SALLA" : null,
        product: order.product
          ? {
              id: order.product.id,
              name: order.product.title,
              nameAr: order.product.titleAr,
              image: order.product.images?.[0] || null,
              price: Number(order.product.price),
              currency: order.product.currency,
            }
          : null,
        quantity: order.quantity,
        totalPrice: Number(order.totalPrice),
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        shippingMethod: order.shippingMethod,
        shippingAddress: order.shippingAddress,
        clickTracking: order.clickTracking
          ? {
              id: order.clickTracking.id,
              referrerCode: order.clickTracking.trackingId,
              referrerUrl: order.clickTracking.referrerUrl,
              platform: order.clickTracking.platform,
            }
          : null,
        commission: commission
          ? {
              id: commission.id,
              amount: Number(commission.commissionAmount),
              status: commission.status,
              rate: Number(commission.commissionRate),
            }
          : null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
      summary: {
        totalOrders,
        totalRevenue,
        totalCommissions,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
    });
  } catch (error) {
    console.error("Merchant orders API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
