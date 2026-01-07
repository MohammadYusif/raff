// src/app/api/debug/zid/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { zidListCategories, zidListProducts } from "@/lib/services/zidApi";
import { ensureZidAccessToken } from "@/lib/services/zid.service";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const extractListItems = (raw: unknown): Record<string, unknown>[] => {
  if (!isRecord(raw)) return [];
  const candidates = [raw.results, raw.products, raw.categories, raw.data, raw.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }
  return [];
};

const extractPagination = (raw: unknown) => {
  if (!isRecord(raw)) return { count: null, next: null, previous: null };
  const count =
    toNumberOrNull(raw.count) ??
    (isRecord(raw.pagination) ? toNumberOrNull(raw.pagination.count) : null) ??
    null;
  const next =
    toStringOrNull(raw.next) ??
    (isRecord(raw.pagination) ? toStringOrNull(raw.pagination.next) : null) ??
    (isRecord(raw.links) ? toStringOrNull(raw.links.next) : null) ??
    null;
  const previous =
    toStringOrNull(raw.previous) ??
    (isRecord(raw.pagination) ? toStringOrNull(raw.pagination.previous) : null) ??
    (isRecord(raw.links) ? toStringOrNull(raw.links.previous) : null) ??
    null;
  return { count, next, previous };
};

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const merchantId = request.nextUrl.searchParams.get("merchantId") ?? "";
  if (!merchantId) {
    return NextResponse.json(
      { error: "Missing merchantId" },
      { status: 400 }
    );
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      zidAccessToken: true,
      zidRefreshToken: true,
      zidTokenExpiry: true,
      zidManagerToken: true,
      zidStoreId: true,
      zidStoreUrl: true,
    },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  if (!merchant.zidAccessToken || !merchant.zidStoreId || !merchant.zidManagerToken) {
    return NextResponse.json(
      { error: "Zid credentials missing" },
      { status: 400 }
    );
  }

  const tokens = await ensureZidAccessToken(merchant);
  const accessToken = tokens.accessToken || merchant.zidAccessToken;
  if (!accessToken) {
    return NextResponse.json(
      { error: "Zid access token missing" },
      { status: 400 }
    );
  }

  const headers = {
    id: merchant.id,
    zidAccessToken: accessToken,
    zidManagerToken: merchant.zidManagerToken,
    zidStoreId: merchant.zidStoreId,
  };

  const productsRaw = await zidListProducts(headers, {
    page: 1,
    pageSize: 1,
    ordering: "updated_at",
    extended: true,
  });
  const categoriesRaw = await zidListCategories(headers);

  const products = extractListItems(productsRaw);
  const categories = extractListItems(categoriesRaw);
  const pagination = extractPagination(productsRaw);

  console.debug("[zid-debug]", {
    merchantId,
    productsCount: products.length,
    categoriesCount: categories.length,
    pagination,
  });

  return NextResponse.json({
    merchantId,
    products: {
      count: products.length,
      total: pagination.count,
      next: pagination.next,
      previous: pagination.previous,
    },
    categories: {
      count: categories.length,
    },
  });
}
