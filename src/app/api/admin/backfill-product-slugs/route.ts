// src/app/api/admin/backfill-product-slugs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { UserRole } from "@prisma/client";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-admin-backfill-product-slugs");


type Platform = "salla" | "zid";

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  merchantId: string;
  sallaProductId: string | null;
  zidProductId: string | null;
};

const MAX_SLUG_ATTEMPTS = 50;
const MAX_SAMPLE_CHANGES = 100;

export async function GET(request: NextRequest) {
  return handleBackfill(request, true);
}

export async function POST(request: NextRequest) {
  return handleBackfill(request, false);
}

async function handleBackfill(request: NextRequest, defaultDryRun: boolean) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId") || "";
    const dryRun =
      searchParams.get("dryRun") === "true" || defaultDryRun;

    if (!merchantId) {
      return NextResponse.json(
        { error: "Missing merchantId" },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        merchantId,
        OR: [
          { sallaProductId: { not: null } },
          { zidProductId: { not: null } },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        titleAr: true,
        merchantId: true,
        sallaProductId: true,
        zidProductId: true,
      },
    });

    let updatedCount = 0;
    let skippedCount = 0;
    const changesSample: Array<{
      id: string;
      oldSlug: string;
      newSlug: string;
      platform: Platform;
      externalId: string;
    }> = [];

    for (const product of products) {
      const platformInfo = getPlatformInfo(product);
      if (!platformInfo) {
        skippedCount += 1;
        continue;
      }

      const safeTitle = getSafeTitle(product);
      const isLegacy = isLegacySlug(
        product.slug,
        safeTitle,
        merchantId,
        platformInfo.externalId,
        platformInfo.platform
      );

      if (!isLegacy) {
        skippedCount += 1;
        continue;
      }

      const baseSlug = `${platformInfo.platform}-${merchantId}-${platformInfo.externalId}-${safeTitle}`;
      const newSlug = await ensureUniqueSlug(baseSlug, product.id);

      if (newSlug === product.slug) {
        skippedCount += 1;
        continue;
      }

      if (!dryRun) {
        await prisma.product.update({
          where: { id: product.id },
          data: { slug: newSlug },
        });
      }

      updatedCount += 1;
      if (changesSample.length < MAX_SAMPLE_CHANGES) {
        changesSample.push({
          id: product.id,
          oldSlug: product.slug,
          newSlug,
          platform: platformInfo.platform,
          externalId: platformInfo.externalId,
        });
      }
    }

    return NextResponse.json({
      merchantId,
      dryRun,
      scannedCount: products.length,
      updatedCount,
      skippedCount,
      changesSample,
    });
  } catch (error) {
    logger.error("Error backfilling product slugs", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to backfill product slugs" },
      { status: 500 }
    );
  }
}

function getPlatformInfo(
  product: ProductRow
): { platform: Platform; externalId: string } | null {
  if (product.zidProductId) {
    return { platform: "zid", externalId: product.zidProductId };
  }
  if (product.sallaProductId) {
    return { platform: "salla", externalId: product.sallaProductId };
  }
  return null;
}

function getSafeTitle(product: ProductRow): string {
  const rawTitle = product.title || product.titleAr || "";
  const safe = slugify(rawTitle);
  return safe || "product";
}

function isLegacySlug(
  slug: string,
  safeTitle: string,
  merchantId: string,
  externalId: string,
  platform: Platform
): boolean {
  const normalized = slug.trim();
  if (!normalized) return true;

  const newPrefix = `${platform}-${merchantId}-${externalId}-`;
  if (normalized.startsWith(newPrefix)) return false;

  if (normalized === externalId) return true;
  if (normalized === safeTitle) return true;
  if (normalized.endsWith(`-${externalId}`)) return true;
  if (normalized.startsWith(`${merchantId}-${externalId}-`)) return true;

  return false;
}

async function ensureUniqueSlug(
  baseSlug: string,
  existingId?: string | null
): Promise<string> {
  for (let counter = 1; counter < MAX_SLUG_ATTEMPTS; counter += 1) {
    const candidate =
      counter === 1 ? baseSlug : `${baseSlug}-${counter}`;
    const conflict = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!conflict || (existingId && conflict.id === existingId)) {
      return candidate;
    }
  }
  throw new Error("Failed to generate unique slug");
}
