// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Fetch orders for the logged-in user
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          customerId: session.user.id,
        },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              titleAr: true,
              slug: true,
              thumbnail: true,
              merchant: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  logo: true,
                  sallaStoreUrl: true,
                  zidStoreUrl: true,
                },
              },
            },
          },
          merchant: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              logo: true,
              sallaStoreUrl: true,
              zidStoreUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.order.count({
        where: {
          customerId: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + orders.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
