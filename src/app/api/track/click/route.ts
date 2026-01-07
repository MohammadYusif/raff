// src/app/api/track/click/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import crypto from "crypto";

const trackClickSchema = z.object({
  productId: z.string().min(1),
});

const VALID_REFERRER_PATHS = [
  /^\/products\/[^/]+/i,
  /^\/(ar|en)\/products\/[^/]+/i,
  /^\/cart$/i,
  /^\/(ar|en)\/cart$/i,
];

const BOT_USER_AGENT_SNIPPETS = [
  "bot",
  "crawler",
  "spider",
  "headless",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "httpclient",
];

const DEDUPE_WINDOW_MS = 15_000;

const DISQUALIFY_REASONS = {
  rateLimit: "RATE_LIMIT",
  botUserAgent: "BOT_UA",
  invalidReferrer: "INVALID_REFERRER",
  invalidFetchSite: "SEC_FETCH_SITE",
  duplicateRecent: "DUPLICATE_RECENT",
  productInactive: "PRODUCT_INACTIVE",
  invalidDestination: "INVALID_DESTINATION",
} as const;

type DisqualifyReason =
  (typeof DISQUALIFY_REASONS)[keyof typeof DISQUALIFY_REASONS];

function hashValue(value?: string | null): string | null {
  if (!value || value === "unknown") return null;
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isValidReferrerPath(pathname: string): boolean {
  return VALID_REFERRER_PATHS.some((pattern) => pattern.test(pathname));
}

function isValidReferrer(referrer: string | null, appOrigin: string): boolean {
  if (!referrer) {
    console.log("[track-click] No referrer provided");
    return false;
  }
  try {
    const url = new URL(referrer);
    const isValidOrigin = url.origin === appOrigin;
    const isValidPath = isValidReferrerPath(url.pathname);

    console.log("[track-click] Referrer validation", {
      referrer,
      appOrigin,
      urlOrigin: url.origin,
      pathname: url.pathname,
      isValidOrigin,
      isValidPath,
    });

    if (!isValidOrigin) return false;
    return isValidPath;
  } catch (error) {
    console.log("[track-click] Invalid referrer URL", { referrer, error });
    return false;
  }
}

function isSuspiciousUserAgent(userAgent: string): boolean {
  const trimmed = userAgent.trim();
  if (!trimmed || trimmed.length < 8) return true;
  const normalized = trimmed.toLowerCase();
  return BOT_USER_AGENT_SNIPPETS.some((snippet) =>
    normalized.includes(snippet)
  );
}

function isValidFetchSite(value: string | null): boolean {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return normalized === "same-origin" || normalized === "same-site";
}

function normalizeUrl(value?: string | null): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isValidDestinationUrl(params: {
  destinationUrl: string;
  platform: "ZID" | "SALLA";
  zidStoreUrl?: string | null;
  sallaStoreUrl?: string | null;
}): boolean {
  const { destinationUrl, platform, zidStoreUrl, sallaStoreUrl } = params;
  const parsed = normalizeUrl(destinationUrl);
  if (!parsed) return false;

  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  const host = parsed.hostname.toLowerCase();
  const storeUrl = platform === "ZID" ? zidStoreUrl : sallaStoreUrl;
  const storeHost = normalizeUrl(storeUrl)?.hostname.toLowerCase();

  if (storeHost && host === storeHost) {
    return true;
  }

  const platformHosts =
    platform === "ZID" ? ["zid.store", "zid.sa"] : ["salla.sa", "salla.shop"];

  const isPlatformHost = platformHosts.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );

  if (!isPlatformHost) return false;

  const path = parsed.pathname.toLowerCase();
  if (platform === "ZID") {
    return path.includes("/products/");
  }
  return path.includes("/product/") || path.includes("/products/");
}

function buildTrackingUrl(
  destinationUrl: string,
  trackingId: string | null,
  slug: string
): string {
  const parsed = normalizeUrl(destinationUrl);
  if (!parsed) return destinationUrl;

  if (trackingId) {
    parsed.searchParams.set("ref", trackingId);
    parsed.searchParams.set("utm_source", "raff");
    parsed.searchParams.set("utm_medium", "affiliate");
    parsed.searchParams.set("utm_campaign", slug);
  }

  return parsed.toString();
}

async function logOutboundClickEvent(data: {
  trackingId: string | null;
  productId: string;
  merchantId: string;
  platform: "ZID" | "SALLA";
  ip: string;
  userAgent: string;
  qualified: boolean;
  disqualifyReason?: DisqualifyReason | null;
}) {
  try {
    await prisma.outboundClickEvent.create({
      data: {
        trackingId: data.trackingId ?? null,
        productId: data.productId,
        merchantId: data.merchantId,
        platform: data.platform,
        ipHash: hashValue(data.ip),
        userAgentHash: hashValue(data.userAgent),
        qualified: data.qualified,
        disqualifyReason: data.disqualifyReason ?? null,
      },
    });
  } catch (error) {
    console.warn("Failed to log outbound click event:", error);
  }
}

/**
 * Track product click and generate affiliate link
 * POST /api/track/click
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = trackClickSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { productId } = parsed.data;

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

    if (!product.isActive) {
      await logOutboundClickEvent({
        trackingId: null,
        productId: product.id,
        merchantId: product.merchantId,
        platform: product.zidProductId ? "ZID" : "SALLA",
        ip: getRequestIp(request.headers),
        userAgent: request.headers.get("user-agent") || "unknown",
        qualified: false,
        disqualifyReason: DISQUALIFY_REASONS.productInactive,
      });
      return NextResponse.json(
        { error: "Product not available" },
        { status: 400 }
      );
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

    if (
      !isValidDestinationUrl({
        destinationUrl,
        platform,
        zidStoreUrl: product.merchant.zidStoreUrl,
        sallaStoreUrl: product.merchant.sallaStoreUrl,
      })
    ) {
      await logOutboundClickEvent({
        trackingId: null,
        productId: product.id,
        merchantId: product.merchantId,
        platform,
        ip: getRequestIp(request.headers),
        userAgent: request.headers.get("user-agent") || "unknown",
        qualified: false,
        disqualifyReason: DISQUALIFY_REASONS.invalidDestination,
      });
      return NextResponse.json(
        { error: "Invalid destination URL" },
        { status: 400 }
      );
    }

    const ip = getRequestIp(request.headers);
    const userAgent = request.headers.get("user-agent") || "unknown";
    const referrerUrl = request.headers.get("referer");
    const secFetchSite = request.headers.get("sec-fetch-site");

    // Get the actual origin from headers (handles Railway's proxy correctly)
    const host = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const appOrigin = host ? `${proto}://${host}` : request.nextUrl.origin;

    const ipLimit = rateLimit(`track-click:ip:${ip}`, {
      windowMs: 60_000,
      max: 30,
    });
    const productLimit = rateLimit(
      `track-click:ip:${ip}:product:${productId}`,
      {
        windowMs: 60_000,
        max: 10,
      }
    );

    let disqualifyReason: DisqualifyReason | null = null;

    if (!ipLimit.allowed || !productLimit.allowed) {
      disqualifyReason = DISQUALIFY_REASONS.rateLimit;
    } else if (isSuspiciousUserAgent(userAgent)) {
      disqualifyReason = DISQUALIFY_REASONS.botUserAgent;
    } else if (!isValidReferrer(referrerUrl, appOrigin)) {
      disqualifyReason = DISQUALIFY_REASONS.invalidReferrer;
    } else if (!isValidFetchSite(secFetchSite)) {
      disqualifyReason = DISQUALIFY_REASONS.invalidFetchSite;
    }

    let trackingId: string | null = null;
    let trackingUrl = destinationUrl;

    let existingTracking: {
      trackingId: string;
      destinationUrl: string;
      expiresAt: Date;
      clickedAt: Date;
    } | null = null;

    if (!disqualifyReason && ip !== "unknown" && userAgent !== "unknown") {
      existingTracking = await prisma.clickTracking.findFirst({
        where: {
          productId: product.id,
          merchantId: product.merchantId,
          platform,
          destinationUrl,
          ipAddress: ip,
          userAgent: userAgent,
          clickedAt: {
            gte: new Date(Date.now() - DEDUPE_WINDOW_MS),
          },
        },
        orderBy: { clickedAt: "desc" },
        select: {
          trackingId: true,
          destinationUrl: true,
          expiresAt: true,
          clickedAt: true,
          merchantId: true,
          platform: true,
        },
      });

      if (existingTracking) {
        disqualifyReason = DISQUALIFY_REASONS.duplicateRecent;
      }
    }

    if (!disqualifyReason) {
      // Generate unique tracking ID
      trackingId = `raff_${nanoid(12)}`;

      // Create click tracking record
      const clickTracking = await prisma.clickTracking.create({
        data: {
          trackingId,
          productId: product.id,
          merchantId: product.merchantId,
          userId: null,
          platform,
          destinationUrl,
          ipAddress: ip,
          userAgent,
          referrerUrl,
          commissionRate: product.merchant.commissionRate,
          clickedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      trackingUrl = buildTrackingUrl(
        clickTracking.destinationUrl,
        clickTracking.trackingId,
        product.slug
      );

      // Update product click count (qualified only)
      await prisma.product.update({
        where: { id: productId },
        data: { clickCount: { increment: 1 } },
      });

      await logOutboundClickEvent({
        trackingId: clickTracking.trackingId,
        productId: product.id,
        merchantId: product.merchantId,
        platform,
        ip,
        userAgent,
        qualified: true,
      });

      return NextResponse.json({
        success: true,
        qualified: true,
        trackingId: clickTracking.trackingId,
        redirectUrl: trackingUrl,
        expiresAt: clickTracking.expiresAt,
      });
    }

    if (existingTracking) {
      trackingId = existingTracking.trackingId;
      trackingUrl = buildTrackingUrl(
        existingTracking.destinationUrl,
        existingTracking.trackingId,
        product.slug
      );
    }

    await logOutboundClickEvent({
      trackingId,
      productId: product.id,
      merchantId: product.merchantId,
      platform,
      ip,
      userAgent,
      qualified: false,
      disqualifyReason,
    });

    if (disqualifyReason === DISQUALIFY_REASONS.rateLimit) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    return NextResponse.json({
      success: true,
      qualified: false,
      trackingId,
      redirectUrl: trackingUrl,
      expiresAt: existingTracking?.expiresAt ?? null,
      disqualifyReason,
    });
  } catch (error) {
    console.error("Click tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}
