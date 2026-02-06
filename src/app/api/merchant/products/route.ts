// src/app/api/merchant/products/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-merchant-products");


export async function GET() {
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

    // Fetch merchant products with analytics
    const products = await prisma.product.findMany({
      where: {
        merchantId,
      },
      select: {
        id: true,
        title: true,
        titleAr: true,
        price: true,
        images: true,
        thumbnail: true,
        quantity: true,
        inStock: true,
        isActive: true,
        createdAt: true,
        clickTrackings: {
          select: {
            id: true,
            clickedAt: true,
          },
        },
        outboundClickEvents: {
          select: {
            id: true,
            createdAt: true,
          },
        },
        orders: {
          select: {
            id: true,
            totalPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform products with analytics
    const productsWithAnalytics = products.map((product) => {
      const totalRevenue = product.orders.reduce(
        (sum, order) => sum + Number(order.totalPrice),
        0
      );
      const views = product.clickTrackings.length; // Using click trackings as views
      const clicks = product.outboundClickEvents.length;
      const orders = product.orders.length;

      return {
        id: product.id,
        name: product.title,
        nameAr: product.titleAr || product.title,
        price: Number(product.price),
        image: product.thumbnail || product.images[0] || null,
        quantity: product.quantity,
        inStock: product.inStock,
        isActive: product.isActive,
        views,
        clicks,
        orders,
        revenue: totalRevenue,
        conversionRate: clicks > 0 ? (orders / clicks) * 100 : 0,
        lastViewedAt: product.clickTrackings[0]?.clickedAt || null,
        createdAt: product.createdAt,
      };
    });

    return NextResponse.json({
      products: productsWithAnalytics,
    });
  } catch (error) {
    logger.error("Error fetching merchant products", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
