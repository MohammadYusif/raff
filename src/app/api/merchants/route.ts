// src/app/api/merchants/route.ts
// LOCATION: src/app/api/merchants/route.ts
// PURPOSE: Get all merchants with product counts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const merchants = await prisma.merchant.findMany({
      where: {
        isActive: true,
        status: "APPROVED", // Only show approved merchants
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        logo: true,
        sallaStoreUrl: true,
        zidStoreUrl: true,
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                inStock: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ merchants });
  } catch (error) {
    console.error("Error fetching merchants:", error);
    return NextResponse.json(
      { error: "Failed to fetch merchants" },
      { status: 500 }
    );
  }
}
