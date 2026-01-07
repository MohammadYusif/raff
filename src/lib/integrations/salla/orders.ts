// src/lib/integrations/salla/orders.ts
import { sallaFetch, type SallaRequestOptions } from "@/lib/integrations/salla/client";
import { toNumberOrNull, toStringOrNull, type SallaMoney } from "@/lib/integrations/salla/products";

export type SallaOrderStatus = {
  id?: number | string;
  name?: string;
  slug?: string;
  customized?: Record<string, unknown>;
};

export type SallaOrderListItem = {
  id?: number | string;
  reference_id?: number | string;
  total?: SallaMoney;
  date?: {
    date?: string;
    timezone?: string;
  };
  status?: SallaOrderStatus;
  payment_method?: string;
  is_pending_payment?: boolean;
  items?: Array<{
    name?: string;
    quantity?: number | string;
    thumbnail?: string;
  }>;
};

export type SallaOrderDetails = {
  id?: number | string;
  reference_id?: number | string;
  status?: SallaOrderStatus | { slug?: string };
  payment_method?: string;
  payment_status?: string;
  currency?: string;
  amounts?: {
    total?: SallaMoney;
  };
  receiver?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  urls?: Record<string, unknown>;
  date?: {
    date?: string;
    timezone?: string;
  };
  updated_at?: string;
};

export type SallaOrderItem = {
  id?: number | string;
  name?: string;
  sku?: string;
  quantity?: number | string;
  currency?: string;
  amounts?: {
    total?: SallaMoney;
  };
  images?: unknown;
  product_id?: number | string;
};

export type SallaOrderHistory = {
  id?: number | string;
  status?: string;
  note?: string;
  created_at?: string;
  type?: string;
  created_by?: Record<string, unknown>;
};

export type SallaPagination = {
  perPage?: number;
  currentPage?: number;
  totalPages?: number;
  links?: {
    previous?: string | null;
    next?: string | null;
  };
};

type SallaListResponse = {
  status?: number;
  success?: boolean;
  data?: unknown;
  pagination?: unknown;
};

type SallaSingleResponse = {
  status?: number;
  success?: boolean;
  data?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parsePagination = (input: unknown): SallaPagination => {
  if (!isRecord(input)) return {};
  const links = isRecord(input.links) ? input.links : undefined;

  return {
    perPage:
      toNumberOrNull(input.perPage) ??
      toNumberOrNull(input.per_page) ??
      undefined,
    currentPage:
      toNumberOrNull(input.currentPage) ??
      toNumberOrNull(input.current_page) ??
      undefined,
    totalPages:
      toNumberOrNull(input.totalPages) ??
      toNumberOrNull(input.total_pages) ??
      undefined,
    links: links
      ? {
          previous: toStringOrNull(links.previous),
          next: toStringOrNull(links.next),
        }
      : undefined,
  };
};

const handleOrdersError = (error: unknown): never => {
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("orders.read")) {
      throw new Error("Missing Salla scope: orders.read");
    }
  }
  throw error;
};

export async function sallaListOrders(
  token: string,
  params?: {
    page?: number;
    perPage?: number;
    fromDate?: string;
    toDate?: string;
    status?: string;
    keyword?: string;
    paymentMethod?: string;
    referenceId?: string | number;
    format?: string;
  },
  requestOptions?: SallaRequestOptions
): Promise<{ items: SallaOrderListItem[]; pagination: SallaPagination }> {
  try {
    const response = await sallaFetch<SallaListResponse>({
      token,
      path: "/admin/v2/orders",
      query: {
        page: params?.page,
        per_page: params?.perPage,
        from_date: params?.fromDate,
        to_date: params?.toDate,
        status: params?.status,
        keyword: params?.keyword,
        payment_method: params?.paymentMethod,
        reference_id: params?.referenceId,
        format: params?.format,
      },
      ...requestOptions,
    });

    if (!Array.isArray(response.data)) {
      throw new Error("Salla list orders data is not an array");
    }

    const items = response.data as SallaOrderListItem[];
    const pagination = parsePagination(response.pagination);

    return { items, pagination };
  } catch (error) {
    return handleOrdersError(error);
  }
}

export async function sallaGetOrderDetails(
  token: string,
  orderId: string,
  params?: { format?: string },
  requestOptions?: SallaRequestOptions
): Promise<SallaOrderDetails> {
  try {
    const response = await sallaFetch<SallaSingleResponse>({
      token,
      path: `/admin/v2/orders/${encodeURIComponent(orderId)}`,
      query: { format: params?.format },
      ...requestOptions,
    });

    if (!isRecord(response.data)) {
      throw new Error("Salla order details data is not an object");
    }

    return response.data as SallaOrderDetails;
  } catch (error) {
    return handleOrdersError(error);
  }
}

export async function sallaListOrderItems(
  token: string,
  orderId: string,
  requestOptions?: SallaRequestOptions
): Promise<SallaOrderItem[]> {
  try {
    const response = await sallaFetch<SallaListResponse>({
      token,
      path: "/admin/v2/orders/items",
      query: { order_id: orderId },
      ...requestOptions,
    });

    if (!Array.isArray(response.data)) {
      throw new Error("Salla order items data is not an array");
    }

    return response.data as SallaOrderItem[];
  } catch (error) {
    return handleOrdersError(error);
  }
}

export async function sallaListOrderHistories(
  token: string,
  orderId: string,
  page = 1,
  requestOptions?: SallaRequestOptions
): Promise<{ items: SallaOrderHistory[]; pagination: SallaPagination }> {
  try {
    const response = await sallaFetch<SallaListResponse>({
      token,
      path: `/admin/v2/orders/${encodeURIComponent(orderId)}/histories`,
      query: { page },
      ...requestOptions,
    });

    if (!Array.isArray(response.data)) {
      throw new Error("Salla order histories data is not an array");
    }

    return {
      items: response.data as SallaOrderHistory[],
      pagination: parsePagination(response.pagination),
    };
  } catch (error) {
    return handleOrdersError(error);
  }
}
