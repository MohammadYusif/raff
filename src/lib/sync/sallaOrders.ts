// src/lib/sync/sallaOrders.ts
import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sallaGetOrderDetails,
  sallaListOrderHistories,
  sallaListOrderItems,
  sallaListOrders,
  type SallaOrderDetails,
  type SallaOrderHistory,
  type SallaOrderItem,
  type SallaOrderListItem,
} from "@/lib/integrations/salla/orders";
import { moneyAmount, toNumberOrNull, toStringOrNull } from "@/lib/integrations/salla/products";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toIntOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
};

const resolveMoneyAmount = (value: unknown): number | null => {
  const fromObj = moneyAmount(value);
  if (fromObj !== null) return fromObj;
  return toNumberOrNull(value);
};

const resolveMoneyCurrency = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  return toStringOrNull(value.currency);
};

const extractStatusSlug = (
  details: SallaOrderDetails | null,
  summary: SallaOrderListItem
): string | null => {
  const detailsStatus = details?.status;
  if (isRecord(detailsStatus)) {
    const slug = toStringOrNull(detailsStatus.slug);
    if (slug) return slug;
  }
  if (detailsStatus && typeof detailsStatus === "object") {
    const slug = toStringOrNull((detailsStatus as { slug?: unknown }).slug);
    if (slug) return slug;
  }
  if (isRecord(summary.status)) {
    const slug = toStringOrNull(summary.status.slug);
    if (slug) return slug;
  }
  return null;
};

const mapSallaStatusToOrderStatus = (slug: string | null): OrderStatus => {
  const normalized = slug?.toLowerCase() ?? "";
  if (normalized === "canceled" || normalized === "cancelled") return "CANCELLED";
  if (normalized === "completed" || normalized === "delivered") return "DELIVERED";
  if (normalized === "shipped") return "SHIPPED";
  if (normalized === "processing" || normalized === "in_progress") return "PROCESSING";
  return "PENDING";
};

const pickPrimaryItem = (items: SallaOrderItem[]): SallaOrderItem | null => {
  if (items.length === 0) return null;
  const withSku = items.find((item) => {
    const sku = toStringOrNull(item.sku);
    return sku !== null && sku.trim().length > 0;
  });
  return withSku ?? items[0] ?? null;
};

const sumItemQuantities = (items: SallaOrderItem[]): number => {
  if (items.length === 0) return 1;
  const sum = items.reduce((total, item) => {
    const qty = toIntOrNull(item.quantity);
    return total + (qty ?? 0);
  }, 0);
  return sum > 0 ? sum : 1;
};

const resolveTotalAmount = (
  details: SallaOrderDetails | null,
  summary: SallaOrderListItem
): { amount: number; currency: string } => {
  const detailsTotal = resolveMoneyAmount(details?.amounts?.total);
  const summaryTotal = resolveMoneyAmount(summary.total);
  const amount = detailsTotal ?? summaryTotal ?? 0;
  const currency =
    resolveMoneyCurrency(details?.amounts?.total) ??
    toStringOrNull(details?.currency) ??
    resolveMoneyCurrency(summary.total) ??
    "SAR";

  return { amount, currency };
};

const extractCustomerInfo = (details: SallaOrderDetails | null) => {
  const receiver = isRecord(details?.receiver) ? details?.receiver : null;
  const customer = isRecord(details?.customer) ? details?.customer : null;

  return {
    name:
      toStringOrNull(receiver?.name) ??
      toStringOrNull(customer?.name) ??
      null,
    email:
      toStringOrNull(receiver?.email) ??
      toStringOrNull(customer?.email) ??
      null,
    phone:
      toStringOrNull(receiver?.phone) ??
      toStringOrNull(customer?.phone) ??
      null,
  };
};

const isNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return error.message.includes("404");
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> => {
  const safeLimit = Math.max(1, limit);
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const runners = Array.from(
    { length: Math.min(safeLimit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const current = nextIndex;
        nextIndex += 1;
        results[current] = await worker(items[current]);
      }
    }
  );

  await Promise.all(runners);
  return results;
};

const findProductMatch = async (
  merchantId: string,
  item: SallaOrderItem | null
): Promise<string | null> => {
  if (!item) return null;

  const itemProductId = toStringOrNull(item.product_id);
  if (itemProductId) {
    const productById = await prisma.product.findFirst({
      where: {
        merchantId,
        sallaProductId: itemProductId,
      },
      select: { id: true },
    });
    if (productById?.id) return productById.id;
  }

  const itemName = toStringOrNull(item.name);
  if (!itemName) return null;

  const productByName = await prisma.product.findFirst({
    where: {
      merchantId,
      OR: [
        { title: { equals: itemName, mode: "insensitive" } },
        { titleAr: { equals: itemName, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  return productByName?.id ?? null;
};

export async function syncSallaOrdersForMerchant(
  merchantId: string,
  opts?: {
    fromDate?: string;
    toDate?: string;
    perPage?: number;
    maxPages?: number;
  }
): Promise<{
  pagesFetched: number;
  ordersSeen: number;
  ordersUpserted: number;
  ordersWithProductMatch: number;
}> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, sallaAccessToken: true },
  });

  const token = merchant?.sallaAccessToken ?? null;
  if (!token) {
    throw new Error("Salla access token missing");
  }

  const perPage = opts?.perPage ?? 30;
  const maxPages = opts?.maxPages ?? 10;
  const concurrency = 4;
  let page = 1;
  let pagesFetched = 0;
  let ordersSeen = 0;
  let ordersUpserted = 0;
  let ordersWithProductMatch = 0;

  while (page <= maxPages) {
    const { items, pagination } = await sallaListOrders(
      token,
      {
        page,
        perPage,
        fromDate: opts?.fromDate,
        toDate: opts?.toDate,
      }
    );

    pagesFetched += 1;
    ordersSeen += items.length;

    await mapWithConcurrency(items, concurrency, async (order) => {
      const orderId = toStringOrNull(order.id);
      if (!orderId) return;

      let details: SallaOrderDetails | null = null;
      let itemsList: SallaOrderItem[] = [];
      let latestHistory: SallaOrderHistory | null = null;

      try {
        const [detailResult, itemsResult, historiesResult] = await Promise.all([
          sallaGetOrderDetails(token, orderId),
          sallaListOrderItems(token, orderId),
          sallaListOrderHistories(token, orderId, 1),
        ]);
        details = detailResult;
        itemsList = itemsResult;
        latestHistory = historiesResult.items[0] ?? null;
      } catch (error) {
        if (isNotFoundError(error)) {
          return;
        }
        throw error;
      }
      // Histories are fetched to validate access; we do not persist them yet.
      void latestHistory;

      const primaryItem = pickPrimaryItem(itemsList);
      const productId = await findProductMatch(merchantId, primaryItem);
      if (productId) ordersWithProductMatch += 1;

      const quantity = sumItemQuantities(itemsList);
      const { amount, currency } = resolveTotalAmount(details, order);
      const statusSlug = extractStatusSlug(details, order);
      const status = mapSallaStatusToOrderStatus(statusSlug);
      const customerInfo = extractCustomerInfo(details);

      const paymentMethod =
        toStringOrNull(details?.payment_method) ??
        toStringOrNull(order.payment_method) ??
        null;
      const paymentStatus = toStringOrNull(details?.payment_status) ?? null;

      await prisma.order.upsert({
        where: { sallaOrderId: orderId },
        create: {
          merchantId,
          platform: "SALLA",
          sallaOrderId: orderId,
          sallaStatus: statusSlug,
          totalPrice: new Prisma.Decimal(amount),
          currency,
          quantity,
          productId: productId ?? null,
          status,
          paymentMethod,
          paymentStatus,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
        },
        update: {
          merchantId,
          platform: "SALLA",
          sallaStatus: statusSlug,
          totalPrice: new Prisma.Decimal(amount),
          currency,
          quantity,
          productId: productId ?? null,
          status,
          paymentMethod,
          paymentStatus,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
        },
      });

      ordersUpserted += 1;
    });

    const currentPage = pagination.currentPage ?? page;
    const totalPages = pagination.totalPages;
    const hasNextLink = Boolean(pagination.links?.next);

    if (typeof totalPages === "number") {
      if (currentPage >= totalPages) break;
      page = currentPage + 1;
      continue;
    }

    if (!hasNextLink) break;
    page = currentPage + 1;
  }

  await prisma.merchant.update({
    where: { id: merchantId },
    data: { lastSyncAt: new Date() },
  });

  console.log("[salla-orders] sync-summary", {
    merchantId,
    pagesFetched,
    ordersSeen,
    ordersUpserted,
    ordersWithProductMatch,
  });

  return { pagesFetched, ordersSeen, ordersUpserted, ordersWithProductMatch };
}
