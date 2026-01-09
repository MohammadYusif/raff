// src/app/api/products/track/route.ts
// PURPOSE: Track product engagement events (views, saves)
// NOTE: Clicks are tracked via /api/track/click which has proper fraud prevention

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";

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

const VALID_REFERRER_PATHS = [
  /^\/products\/[^/]+/i,
  /^\/(ar|en)\/products\/[^/]+/i,
  /^\/$/i, // Homepage
  /^\/(ar|en)$/i, // Localized homepage
  /^\/categories/i,
  /^\/(ar|en)\/categories/i,
  /^\/trending/i,
  /^\/(ar|en)\/trending/i,
];

function isSuspiciousUserAgent(userAgent: string): boolean {
  const trimmed = userAgent.trim();
  if (!trimmed || trimmed.length < 8) return true;
  const normalized = trimmed.toLowerCase();
  return BOT_USER_AGENT_SNIPPETS.some((snippet) =>
    normalized.includes(snippet)
  );
}

function isValidReferrer(referrer: string | null, appOrigin: string): boolean {
  if (!referrer) return false;

  try {
    const url = new URL(referrer);
    if (url.origin !== appOrigin) return false;
    return VALID_REFERRER_PATHS.some((pattern) => pattern.test(url.pathname));
  } catch {
    return false;
  }
}

function isValidFetchSite(value: string | null): boolean {
  if (!value) return true; // Not all browsers send this
  const normalized = value.toLowerCase();
  return normalized === "same-origin" || normalized === "same-site";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, eventType } = body;

    if (!productId || !eventType) {
      return NextResponse.json(
        { error: "productId and eventType are required" },
        { status: 400 }
      );
    }

    // Validate event type - REMOVED CLICK (use /api/track/click instead)
    const validEvents = ["VIEW", "SAVE"];
    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });

    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fraud prevention
    const ip = getRequestIp(request.headers);
    const userAgent = request.headers.get("user-agent") || "unknown";
    const referrerUrl = request.headers.get("referer");
    const secFetchSite = request.headers.get("sec-fetch-site");

    const host = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const appOrigin = host ? `${proto}://${host}` : request.nextUrl.origin;

    // Rate limiting: 100 events/minute per IP
    const ipLimit = rateLimit(`track-event:ip:${ip}`, {
      windowMs: 60_000,
      max: 100,
    });

    // Per product: 20 events/minute per IP
    const productLimit = rateLimit(`track-event:ip:${ip}:product:${productId}`, {
      windowMs: 60_000,
      max: 20,
    });

    if (!ipLimit.allowed || !productLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Bot detection
    if (isSuspiciousUserAgent(userAgent)) {
      return NextResponse.json({ success: true }, { status: 200 }); // Silent fail
    }

    // Referrer validation
    if (!isValidReferrer(referrerUrl, appOrigin)) {
      return NextResponse.json({ success: true }, { status: 200 }); // Silent fail
    }

    // Security headers check
    if (!isValidFetchSite(secFetchSite)) {
      return NextResponse.json({ success: true }, { status: 200 }); // Silent fail
    }

    // Determine weight based on event type
    const weights: Record<string, number> = {
      VIEW: 1.0,
      SAVE: 3.0,
    };

    const weight = weights[eventType] || 1.0;

    // Create trending log entry (fail-soft)
    try {
      await prisma.trendingLog.create({
        data: {
          productId,
          eventType: eventType as "VIEW" | "SAVE",
          weight,
          metadata: {
            timestamp: new Date().toISOString(),
            userAgent: userAgent.substring(0, 100), // Truncate for storage
          },
        },
      });
    } catch (error) {
      console.warn("Failed to log trending event:", error);
    }

    // Update product counters based on event type
    if (eventType === "VIEW") {
      await prisma.product.update({
        where: { id: productId },
        data: {
          viewCount: { increment: 1 },
        },
      });
    }

    return NextResponse.json(
      { success: true, message: "Event tracked successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error tracking product event:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}
