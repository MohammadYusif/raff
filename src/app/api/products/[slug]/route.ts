// src/app/api/products/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await params;
    const slug = normalizeSlug(rawSlug);
    const isDev = process.env.NODE_ENV !== "production";

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            logo: true,
            description: true, // ← Add this
            descriptionAr: true, // ← Add this
            sallaStoreUrl: true,
            zidStoreUrl: true,
            phone: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            slug: true,
          },
        },
      },
    });

    if (!product) {
      if (isDev) {
        const fallback = await prisma.product.findFirst({
          where: {
            OR: [{ sallaProductId: slug }, { zidProductId: slug }],
          },
          select: {
            id: true,
            slug: true,
            sallaProductId: true,
            zidProductId: true,
          },
        });

        const contains = await prisma.product.findFirst({
          where: { slug: { contains: "فستان" } },
          select: { slug: true },
        });

        console.debug("[products] slug-debug", {
          requestedSlug: slug,
          fallbackMatched: Boolean(fallback),
          fallbackSlug: fallback?.slug ?? null,
          containsCheck: contains?.slug ?? null,
        });
      }

      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (isDev) {
      console.debug("[products] slug-lookup", {
        requestedSlug: slug,
        found: true,
        fallbackMatched: false,
        matchedBy: null,
        fallbackSlug: null,
      });
    }

    // Increment view count
    await prisma.product.update({
      where: { id: product.id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    // Log trending event (fail-soft)
    try {
      await prisma.trendingLog.create({
        data: {
          productId: product.id,
          eventType: "VIEW",
          weight: 1.0,
        },
      });
    } catch (error) {
      console.warn("Failed to log trending view event:", error);
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

function normalizeSlug(raw: string): string {
  // 1) trim and handle "+" (rare but safe)
  const cleaned = raw.trim().replaceAll("+", "%20");

  // 2) decode once
  const once = safeDecode(cleaned);

  // 3) decode twice (fixes double-encoding from encodeURIComponent + Next/link/router)
  const twice = safeDecode(once);

  // 4) normalize unicode (important for Arabic)
  return twice.trim().normalize("NFC");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
