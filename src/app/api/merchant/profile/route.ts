// src/app/api/merchant/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // TODO: Get merchant ID from authenticated session
    const merchantId = request.nextUrl.searchParams.get("merchantId");

    if (!merchantId) {
      return NextResponse.json(
        { error: "Merchant ID is required" },
        { status: 401 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        email: true,
        phone: true,
        logo: true,
        description: true,
        descriptionAr: true,
        // Zid fields
        zidStoreId: true,
        zidStoreUrl: true,
        // Salla fields
        sallaStoreId: true,
        sallaStoreUrl: true,
        status: true,
        isActive: true,
        autoSyncProducts: true,
        lastSyncAt: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
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

    if (merchant.status !== "APPROVED" || !merchant.isActive) {
      return NextResponse.json(
        {
          error: "Merchant account is not active",
          status: merchant.status,
        },
        { status: 403 }
      );
    }

    // Determine which platform is connected
    let platform: "zid" | "salla" | null = null;
    let storeId: string | null = null;
    let storeUrl: string | null = null;
    let isConnected = false;

    if (merchant.zidStoreId) {
      platform = "zid";
      storeId = merchant.zidStoreId;
      storeUrl = merchant.zidStoreUrl;
      isConnected = true;
    } else if (merchant.sallaStoreId) {
      platform = "salla";
      storeId = merchant.sallaStoreId;
      storeUrl = merchant.sallaStoreUrl;
      isConnected = true;
    }

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        name: merchant.name,
        nameAr: merchant.nameAr,
        email: merchant.email,
        phone: merchant.phone,
        logo: merchant.logo,
        description: merchant.description,
        descriptionAr: merchant.descriptionAr,
        storeInfo: {
          platform,
          storeId,
          storeUrl,
          isConnected,
          lastSyncAt: merchant.lastSyncAt,
          autoSyncEnabled: merchant.autoSyncProducts,
        },
        totalProducts: merchant._count.products,
        status: merchant.status,
        approvedAt: merchant.approvedAt,
        createdAt: merchant.createdAt,
        updatedAt: merchant.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching merchant profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch merchant profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const merchantId = request.nextUrl.searchParams.get("merchantId");

    if (!merchantId) {
      return NextResponse.json(
        { error: "Merchant ID is required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      phone,
      autoSyncProducts,
    } = body;

    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        ...(name && { name }),
        ...(nameAr && { nameAr }),
        ...(description && { description }),
        ...(descriptionAr && { descriptionAr }),
        ...(phone && { phone }),
        ...(typeof autoSyncProducts === "boolean" && { autoSyncProducts }),
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        phone: true,
        autoSyncProducts: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      merchant: updatedMerchant,
    });
  } catch (error) {
    console.error("Error updating merchant profile:", error);
    return NextResponse.json(
      { error: "Failed to update merchant profile" },
      { status: 500 }
    );
  }
}
