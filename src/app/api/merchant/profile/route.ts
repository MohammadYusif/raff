// src/app/api/merchant/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/auth/guards";

export async function GET(_request: NextRequest) {
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

    const merchant = await prisma.merchant.findFirst({
      where: {
        id: merchantId,
        userId: session.user.id,
        status: "APPROVED",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        email: true,
        phone: true,
        logo: true,
        description: true,
        descriptionAr: true,
        zidStoreId: true,
        zidStoreUrl: true,
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
        { error: "Merchant not found or not approved" },
        { status: 404 }
      );
    }

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

    const body = await request.json();
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      phone,
      autoSyncProducts,
    } = body;

    const existingMerchant = await prisma.merchant.findFirst({
      where: { id: merchantId, userId: session.user.id },
      select: { id: true },
    });

    if (!existingMerchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    const updatedMerchant = await prisma.merchant.update({
      where: { id: existingMerchant.id },
      data: {
        ...(name && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(phone !== undefined && { phone }),
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
