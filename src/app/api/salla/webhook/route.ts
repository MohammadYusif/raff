// src/app/api/salla/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSallaConfig } from "@/lib/platform/config";
import {
  getHeaderValue,
  maskSensitive,
  safeJsonParse,
  timingSafeEqual,
} from "@/lib/platform/webhooks";
import {
  deactivateSallaProduct,
  syncSallaProductById,
} from "@/lib/services/salla.service";
import { normalizeStoreUrl } from "@/lib/platform/store";
import { registerSallaWebhooks } from "@/lib/platform/webhook-register";

const SALLA_PRODUCT_UPSERT_EVENTS = new Set([
  "product.created",
  "product.updated",
  "product.published",
  "product.unpublished",
]);

const SALLA_PRODUCT_DELETE_EVENTS = new Set([
  "product.deleted",
  "product.removed",
]);

function extractStoreId(payload: Record<string, any>): string | null {
  return (
    payload.store_id ||
    payload.storeId ||
    payload.store?.id ||
    payload.data?.store_id ||
    payload.data?.store?.id ||
    null
  );
}

function extractEvent(payload: Record<string, any>): string | null {
  return (
    payload.event ||
    payload.event_type ||
    payload.type ||
    payload.data?.event ||
    payload.data?.type ||
    null
  );
}

function extractProductId(payload: Record<string, any>): string | null {
  return (
    payload.product_id ||
    payload.product?.id ||
    payload.data?.product_id ||
    payload.data?.product?.id ||
    null
  );
}

function parseExpiry(value: unknown): Date | null {
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms);
  }
  if (typeof value === "string" && value) {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) {
      const ms = asNumber > 1e12 ? asNumber : asNumber * 1000;
      return new Date(ms);
    }
  }
  return null;
}

function extractEasyModeAuth(payload: Record<string, any>) {
  const data = payload.data || payload;
  return {
    // TODO: Align field names with Salla app.store.authorize payload.
    accessToken:
      data.access_token ||
      data.accessToken ||
      data.tokens?.access_token ||
      null,
    refreshToken:
      data.refresh_token ||
      data.refreshToken ||
      data.tokens?.refresh_token ||
      null,
    expiresAt: parseExpiry(data.expires_at || data.expiresAt || data.expiry),
    storeId: extractStoreId(payload),
    storeUrl: data.store_url || data.storeUrl || data.store?.url || null,
  };
}

export async function POST(request: NextRequest) {
  const config = getSallaConfig();
  const headerName = config.webhook.header;
  const secret = config.webhook.secret;

  if (!headerName || !secret) {
    return NextResponse.json(
      { error: "Webhook configuration missing" },
      { status: 500 }
    );
  }

  const headerValue = getHeaderValue(request.headers, headerName);
  if (!headerValue || !timingSafeEqual(headerValue, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  const payload = safeJsonParse<Record<string, any>>(rawBody);

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const shouldLogPayloads =
    process.env.NODE_ENV !== "production" ||
    process.env.LOG_WEBHOOK_PAYLOADS === "true";
  if (shouldLogPayloads) {
    console.info("Salla webhook received", {
      headers: maskSensitive(Object.fromEntries(request.headers.entries())),
      payload: maskSensitive(payload),
    });
  }

  const event = (extractEvent(payload) || "").toLowerCase();

  if (event === "app.store.authorize") {
    const auth = extractEasyModeAuth(payload);
    if (!auth.storeId || !auth.accessToken) {
      return NextResponse.json(
        { error: "Missing store id or tokens" },
        { status: 400 }
      );
    }

    const normalizedStoreUrl = normalizeStoreUrl(auth.storeUrl);
    const updateData = {
      sallaStoreId: auth.storeId,
      sallaStoreUrl: normalizedStoreUrl || undefined,
      sallaAccessToken: auth.accessToken,
      sallaRefreshToken: auth.refreshToken,
      sallaTokenExpiry: auth.expiresAt,
    };

    const updatedByStoreId = await prisma.merchant.updateMany({
      where: { sallaStoreId: auth.storeId },
      data: updateData,
    });

    let updatedCount = updatedByStoreId.count;
    if (updatedCount === 0 && normalizedStoreUrl) {
      const updatedByStoreUrl = await prisma.merchant.updateMany({
        where: {
          sallaStoreId: null,
          sallaStoreUrl: normalizedStoreUrl,
        },
        data: updateData,
      });
      updatedCount = updatedByStoreUrl.count;
    }

    if (updatedCount === 0) {
      console.warn("Salla Easy Mode auth received for unknown store", {
        storeId: auth.storeId,
        storeUrl: normalizedStoreUrl || auth.storeUrl,
      });
      return NextResponse.json({ status: "ignored", reason: "store_not_linked" });
    }

    try {
      await registerSallaWebhooks({ accessToken: auth.accessToken });
    } catch (error) {
      console.error("Salla webhook registration failed:", error);
    }

    return NextResponse.json({ status: "ok" });
  }

  const storeId = extractStoreId(payload);
  if (!storeId) {
    return NextResponse.json(
      { error: "Missing store identifier" },
      { status: 400 }
    );
  }

  const merchant = await prisma.merchant.findFirst({
    where: { sallaStoreId: storeId },
    select: {
      id: true,
      sallaAccessToken: true,
      sallaRefreshToken: true,
      sallaTokenExpiry: true,
      sallaStoreId: true,
      sallaStoreUrl: true,
    },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const productId = extractProductId(payload);
  if (productId) {
    if (SALLA_PRODUCT_DELETE_EVENTS.has(event)) {
      await deactivateSallaProduct(merchant.id, productId);
    } else if (SALLA_PRODUCT_UPSERT_EVENTS.has(event)) {
      await syncSallaProductById(merchant, productId);
    }
  }

  return NextResponse.json({ status: "ok" });
}
