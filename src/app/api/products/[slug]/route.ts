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
    if (isDev) {
      console.debug("[products] slug-normalize", {
        rawSlug,
        decodedSlug: slug,
        rawLen: rawSlug.length,
        decodedLen: slug.length,
      });
    }

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
        const matchedBy = fallback
          ? fallback.sallaProductId === slug
            ? "sallaProductId"
            : fallback.zidProductId === slug
              ? "zidProductId"
              : null
          : null;
        console.debug("[products] slug-lookup", {
          requestedSlug: slug,
          found: false,
          fallbackMatched: Boolean(fallback),
          matchedBy,
          fallbackSlug: fallback?.slug ?? null,
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
  const cleaned = raw.trim().replaceAll("+", "%20");

  const once = safeDecode(cleaned);
  const twice = safeDecode(once);

  // normalize unicode (important for Arabic)
  return twice.trim().normalize("NFC");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
