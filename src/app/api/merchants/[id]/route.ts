// src/app/api/merchants/[id]/route.ts
// PURPOSE: Get single merchant with product count

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-merchants-id");


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const merchant = await prisma.merchant.findFirst({
      where: {
        id,
        isActive: true,
        status: "APPROVED",
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        logo: true,
        phone: true,
        email: true,
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

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ merchant });
  } catch (error) {
    logger.error("Error fetching merchant", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch merchant" },
      { status: 500 }
    );
  }
}
