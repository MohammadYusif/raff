// src/app/api/track/click/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";

const trackClickSchema = z.object({
  productId: z.string().min(1),
});

/**
 * Track product click and generate affiliate link
 * POST /api/track/click
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request.headers);
    const limit = rateLimit(`track-click:${ip}`, {
      windowMs: 60_000,
      max: 30,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = trackClickSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { productId } = parsed.data;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Fetch product with merchant info
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        merchant: {
          select: {
            id: true,
            zidStoreUrl: true,
            sallaStoreUrl: true,
            commissionRate: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Determine platform and destination URL
    const platform = product.zidProductId ? "ZID" : "SALLA";
    const destinationUrl =
      platform === "ZID"
        ? product.externalProductUrl ||
          `${product.merchant.zidStoreUrl}/products/${product.zidProductId}`
        : product.externalProductUrl ||
          product.sallaUrl ||
          `${product.merchant.sallaStoreUrl}/product/${product.sallaProductId}`;

    if (!destinationUrl) {
      return NextResponse.json(
        { error: "Product URL not available" },
        { status: 400 }
      );
    }

    // Generate unique tracking ID
    const trackingId = nanoid(12); // e.g., "a1b2c3d4e5f6"

    // Get request metadata
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const referrerUrl = request.headers.get("referer");

    // Create click tracking record
    const clickTracking = await prisma.clickTracking.create({
      data: {
        trackingId: `raff_${trackingId}`,
        productId: product.id,
        merchantId: product.merchantId,
        userId: null,
        platform,
        destinationUrl,
        ipAddress,
        userAgent,
        referrerUrl,
        commissionRate: product.merchant.commissionRate,
        clickedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Generate affiliate URL with tracking parameter
    let trackingUrl: URL;
    try {
      trackingUrl = new URL(destinationUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid destination URL" },
        { status: 400 }
      );
    }
    trackingUrl.searchParams.set("ref", clickTracking.trackingId);
    trackingUrl.searchParams.set("utm_source", "raff");
    trackingUrl.searchParams.set("utm_medium", "affiliate");
    trackingUrl.searchParams.set("utm_campaign", product.slug);

    // Update product click count
    await prisma.product.update({
      where: { id: productId },
      data: { clickCount: { increment: 1 } },
    });

    // Return tracking URL
    return NextResponse.json({
      success: true,
      trackingId: clickTracking.trackingId,
      trackingUrl: trackingUrl.toString(),
      expiresAt: clickTracking.expiresAt,
    });
  } catch (error) {
    console.error("Click tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}
