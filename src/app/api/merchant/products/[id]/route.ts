// src/app/api/merchant/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/auth/guards";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  inStock: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  void request;
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

    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        merchantId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            slug: true,
          },
        },
        productTags: {
          include: {
            tag: true,
          },
        },
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
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Calculate analytics
    const views = product.clickTrackings.length;
    const clicks = product.outboundClickEvents.length;
    const orders = product.orders.length;
    const revenue = product.orders.reduce(
      (sum, order) => sum + Number(order.totalPrice),
      0
    );

    return NextResponse.json({
      product: {
        id: product.id,
        title: product.title,
        titleAr: product.titleAr,
        description: product.description,
        descriptionAr: product.descriptionAr,
        slug: product.slug,
        price: Number(product.price),
        originalPrice: product.originalPrice
          ? Number(product.originalPrice)
          : null,
        currency: product.currency,
        images: product.images,
        thumbnail: product.thumbnail,
        isActive: product.isActive,
        inStock: product.inStock,
        category: product.category,
        tags: product.productTags.map((pt) => pt.tag),
        sallaProductId: product.sallaProductId,
        zidProductId: product.zidProductId,
        views,
        clicks,
        orders,
        revenue,
        conversionRate: clicks > 0 ? (orders / clicks) * 100 : 0,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params;
    const body = await request.json();
    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    // Verify product belongs to merchant
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        merchantId,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const {
      title,
      titleAr,
      description,
      descriptionAr,
      price,
      originalPrice,
      isActive,
      inStock,
      tags,
    } = validation.data;

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(titleAr !== undefined && { titleAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(price && { price }),
        ...(originalPrice !== undefined && { originalPrice }),
        ...(typeof isActive === "boolean" && { isActive }),
        ...(typeof inStock === "boolean" && { inStock }),
      },
    });

    // Handle tags if provided
    if (tags) {
      // Remove existing tags
      await prisma.productTag.deleteMany({
        where: { productId: id },
      });

      // Find or create tags and associate with product
      for (const tagName of tags) {
        const normalizedTag = tagName.toLowerCase().trim();
        const tagSlug = normalizedTag.replace(/\s+/g, "-").replace(/[^\w\-]/g, "");

        // Find or create tag
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          create: { name: normalizedTag, slug: tagSlug },
          update: {},
        });

        // Create product-tag association
        await prisma.productTag.create({
          data: {
            productId: id,
            tagId: tag.id,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  void request;
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

    const { id } = await params;

    // Verify product belongs to merchant
    const product = await prisma.product.findFirst({
      where: {
        id,
        merchantId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
