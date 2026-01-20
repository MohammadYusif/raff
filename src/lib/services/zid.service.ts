// src/lib/services/zid.service.ts
// PURPOSE: Zid API integration service for merchant product sync
//
// Zid API Token Mapping (from OAuth response):
// - authorization (or Authorization) → Bearer token for Authorization header
// - access_token → X-Manager-Token header (also called manager token)
// - refresh_token → Used to refresh tokens
//
// Every Zid API request MUST send BOTH:
// - Authorization: Bearer <authorization_token>
// - X-Manager-Token: <manager_token> (which is access_token from OAuth)

import { prisma } from "@/lib/prisma";
import { getZidConfig } from "@/lib/platform/config";
import { fetchWithTimeout } from "@/lib/platform/fetch";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("zid-service");

type RateLimitInfo = {
  url: string;
  retryAfterMs: number | null;
  attempt: number;
};

type ZidConfig = {
  authorizationToken: string; // Bearer token (authorization from OAuth)
  managerToken: string; // X-Manager-Token (access_token from OAuth)
  refreshAccessToken?: () => Promise<{ authorizationToken: string; managerToken: string } | null>;
  onRateLimit?: (info: RateLimitInfo) => void;
  language?: "ar" | "en";
};

export type ZidMerchantAuth = {
  id: string;
  zidAccessToken: string | null; // This stores authorization token
  zidRefreshToken: string | null;
  zidTokenExpiry: Date | null;
  zidManagerToken: string | null; // This stores manager token (access_token)
  zidStoreId: string | null;
  zidStoreUrl: string | null;
};

export type ZidTokenState = {
  authorizationToken: string | null;
  managerToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
};

// Zid API response types
export interface ZidProduct {
  id: string | number;
  name?: string;
  short_description?: string;
  description?: string;
  price?: number | { amount?: number | string; currency?: string };
  sale_price?: number | { amount?: number | string; currency?: string };
  quantity?: number;
  status?: string;
  sku?: string;
  slug?: string;
  images?: Array<{ url?: string; src?: string; original?: string }>;
  html_url?: string;
  url?: string;
  category?: { id?: string | number; name?: string };
  categories?: Array<{ id: string | number; name?: string }>;
  is_active?: boolean;
  in_stock?: boolean;
  rating?: { average?: number; count?: number };
  variants?: ZidProductVariant[];
  created_at?: string;
  updated_at?: string;
}

export interface ZidProductVariant {
  id: string | number;
  name?: string;
  sku?: string;
  price?: number;
  sale_price?: number;
  quantity?: number;
  is_active?: boolean;
}

export interface ZidCategory {
  id: string | number;
  name?: string;
  description?: string;
  image?: string;
  parent_id?: string | number | null;
  products_count?: number;
}

export interface ZidOrder {
  id: string | number;
  code?: string;
  status?: string;
  total?: number | { amount?: number };
  sub_total?: number | { amount?: number };
  shipping_cost?: number | { amount?: number };
  order_currency?: { code?: string; exchange_rate?: number };
  store_currency?: { code?: string; exchange_rate?: number };
  customer?: {
    id?: string | number;
    name?: string;
    email?: string;
    phone?: string;
  };
  products?: ZidOrderProduct[];
  created_at?: string;
  updated_at?: string;
  payment_method?: { name?: string };
  shipping?: { method?: string; tracking_number?: string };
  referrer_code?: string;
}

export interface ZidOrderProduct {
  id: string | number;
  product_id?: string | number;
  name?: string;
  quantity?: number;
  price?: number | { amount?: number };
  total?: number | { amount?: number };
}

export interface ZidReview {
  id: string | number;
  product_id?: string | number;
  customer_name?: string;
  rating?: number;
  comment?: string;
  status?: string;
  reply?: { text?: string; created_at?: string };
  images?: Array<{ url?: string }>;
  created_at?: string;
}

export interface ZidStoreProfile {
  id: string | number;
  name?: string;
  email?: string;
  domain?: string;
  url?: string;
  title?: string;
  store?: {
    id?: string | number;
    title?: string;
    url?: string;
    domain?: string;
  };
}

interface ZidPaginatedResponse<T> {
  data?: T[];
  items?: T[];
  products?: T[];
  categories?: T[];
  orders?: T[];
  reviews?: T[];
  pagination?: {
    page?: number;
    next_page?: number | null;
    last_page?: number;
    result_count?: number;
    total?: number;
    total_pages?: number;
  };
  meta?: {
    page?: number;
    last_page?: number;
    total?: number;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export class ZidService {
  private baseUrl: string;
  private authorizationToken: string;
  private managerToken: string;
  private refreshAccessToken?: () => Promise<{ authorizationToken: string; managerToken: string } | null>;
  private onRateLimit?: (info: RateLimitInfo) => void;
  private language: "ar" | "en";

  constructor(config: ZidConfig) {
    const zidConfig = getZidConfig();
    this.baseUrl = zidConfig.apiBaseUrl;
    this.authorizationToken = config.authorizationToken;
    this.managerToken = config.managerToken;
    this.refreshAccessToken = config.refreshAccessToken;
    this.onRateLimit = config.onRateLimit;
    this.language = config.language || "ar";
  }

  private getHeaders(): Record<string, string> {
    // Zid API requires BOTH headers on every request
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.authorizationToken}`,
      "X-Manager-Token": this.managerToken,
      "Access-Token": this.managerToken, // Some endpoints use this instead
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Language": this.language,
    };

    return headers;
  }

  private buildPagedUrl(
    path: string,
    page: number,
    pageSize: number,
    extraParams?: Record<string, string>
  ): string {
    const url = new URL(path, this.baseUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(pageSize));
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  private async fetchJson<T>(url: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      const options: RequestInit = {
        method,
        headers: this.getHeaders(),
      };

      if (body && method === "POST") {
        options.body = JSON.stringify(body);
      }

      const response = await fetchWithTimeout(url, options);

      if (!response.ok) {
        // Handle 401/403 - token refresh
        if ((response.status === 401 || response.status === 403) && this.refreshAccessToken && attempt === 0) {
          await response.body?.cancel();
          try {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
              this.authorizationToken = refreshed.authorizationToken;
              this.managerToken = refreshed.managerToken;
              attempt += 1;
              logger.debug("Tokens refreshed, retrying request", { url });
              continue;
            } else {
              logger.error("Token refresh returned null", { url });
              throw new Error("Token refresh failed - merchant requires reconnection");
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error("Token refresh threw error", { url, error: errorMsg });
            throw new Error(`Token refresh failed: ${errorMsg}`);
          }
        }

        // Handle 429 - rate limiting (60 req/min for products)
        if (response.status === 429 && attempt + 1 < maxAttempts) {
          const retryAfter = response.headers.get("retry-after");
          let retryAfterMs: number | null = null;

          if (retryAfter) {
            const seconds = Number(retryAfter);
            if (!Number.isNaN(seconds)) {
              retryAfterMs = Math.min(Math.max(seconds * 1000, 0), 60000);
            }
          }

          // Exponential backoff with jitter
          if (retryAfterMs === null) {
            const baseDelay = 1000 * Math.pow(2, attempt);
            const jitter = Math.random() * 1000;
            retryAfterMs = Math.min(baseDelay + jitter, 60000);
          }

          this.onRateLimit?.({
            url,
            retryAfterMs,
            attempt: attempt + 1,
          });

          await response.body?.cancel();
          await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
          attempt += 1;
          continue;
        }

        // Handle 5xx - server errors, retry with backoff
        if (response.status >= 500 && attempt + 1 < maxAttempts) {
          await response.body?.cancel();
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          attempt += 1;
          continue;
        }

        const bodyText = await response.text();
        logger.error("Zid API error", {
          url,
          status: response.status,
          body: bodyText.substring(0, 500),
        });
        throw new Error(`Zid API error ${response.status}: ${bodyText}`);
      }

      const bodyText = await response.text();
      if (!bodyText) {
        throw new Error("Zid API empty response body");
      }
      try {
        return JSON.parse(bodyText) as T;
      } catch {
        throw new Error(`Zid API invalid JSON: ${bodyText.substring(0, 200)}`);
      }
    }

    throw new Error("Zid API request failed after retries");
  }

  /**
   * Fetch store manager profile
   * GET /managers/account/profile
   */
  async fetchStoreProfile(): Promise<ZidStoreProfile | null> {
    const url = `${this.baseUrl}/managers/account/profile`;
    logger.debug("fetchStoreProfile", { url });

    try {
      const data = await this.fetchJson<Record<string, unknown>>(url);

      // Response might have manager or user or store object
      const profileRaw =
        (data.manager as Record<string, unknown> | undefined) ||
        (data.user as Record<string, unknown> | undefined) ||
        (data.store as Record<string, unknown> | undefined) ||
        data;

      if (!profileRaw) {
        logger.debug("fetchStoreProfile - no profile in response", { keys: Object.keys(data) });
        return null;
      }

      // Extract store info - it might be nested
      const storeRaw = (profileRaw.store as Record<string, unknown> | undefined) || profileRaw;
      const storeId = storeRaw.id || profileRaw.id;
      const storeDomain = storeRaw.domain || storeRaw.url || profileRaw.domain || profileRaw.url;

      logger.debug("fetchStoreProfile - result", {
        hasProfile: true,
        storeId,
        storeDomain,
        profileKeys: Object.keys(profileRaw),
      });

      return {
        id: storeId as string | number,
        name: (profileRaw.name || storeRaw.title || profileRaw.title) as string | undefined,
        email: profileRaw.email as string | undefined,
        domain: storeDomain as string | undefined,
        url: storeDomain as string | undefined,
        title: (storeRaw.title || profileRaw.title || profileRaw.name) as string | undefined,
        store: storeRaw !== profileRaw ? storeRaw as ZidStoreProfile["store"] : undefined,
      };
    } catch (error) {
      logger.error("fetchStoreProfile failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List products with pagination
   * GET /products/?extended=true&ordering=updated_at&page_size=...&page=...
   */
  async fetchProducts(
    page: number = 1,
    pageSize: number = 50,
    options?: { ordering?: "created_at" | "updated_at" }
  ): Promise<ZidPaginatedResponse<ZidProduct>> {
    const extraParams: Record<string, string> = {
      extended: "true", // REQUIRED to include variants
    };
    if (options?.ordering) {
      extraParams.ordering = options.ordering;
    }

    const url = this.buildPagedUrl("/products/", page, pageSize, extraParams);
    logger.debug("fetchProducts", { page, pageSize, url });

    const raw = await this.fetchJson<unknown>(url);
    if (!isRecord(raw)) {
      throw new Error("Zid products response not an object");
    }

    const productsRaw = raw.data ?? raw.products ?? raw.items ?? [];
    const products = Array.isArray(productsRaw) ? (productsRaw as ZidProduct[]) : [];

    // Extract pagination
    const pagination = isRecord(raw.pagination)
      ? (raw.pagination as ZidPaginatedResponse<ZidProduct>["pagination"])
      : isRecord(raw.meta)
      ? {
          page: (raw.meta as Record<string, unknown>).page as number | undefined,
          last_page: (raw.meta as Record<string, unknown>).last_page as number | undefined,
          total: (raw.meta as Record<string, unknown>).total as number | undefined,
        }
      : {};

    logger.debug("fetchProducts result", {
      page,
      count: products.length,
      pagination,
    });

    return { products, pagination };
  }

  /**
   * List categories
   * GET /managers/store/categories
   */
  async fetchCategories(): Promise<ZidCategory[]> {
    const url = `${this.baseUrl}/managers/store/categories`;
    logger.debug("fetchCategories", { url });

    const raw = await this.fetchJson<unknown>(url);
    if (!isRecord(raw)) {
      throw new Error("Zid categories response not an object");
    }

    const categoriesRaw = raw.categories ?? raw.data ?? raw.items ?? [];
    const categories = Array.isArray(categoriesRaw) ? (categoriesRaw as ZidCategory[]) : [];

    logger.debug("fetchCategories result", { count: categories.length });
    return categories;
  }

  /**
   * List orders with pagination
   * GET /managers/store/orders?payload_type=default&page=...&per_page=...
   */
  async fetchOrders(
    page: number = 1,
    perPage: number = 50,
    options?: {
      dateFrom?: string;
      dateTo?: string;
      status?: string;
    }
  ): Promise<ZidPaginatedResponse<ZidOrder>> {
    const url = new URL("/managers/store/orders", this.baseUrl);
    url.searchParams.set("payload_type", "default"); // REQUIRED to include products
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));

    if (options?.dateFrom) {
      url.searchParams.set("date_from", options.dateFrom);
    }
    if (options?.dateTo) {
      url.searchParams.set("date_to", options.dateTo);
    }
    if (options?.status) {
      url.searchParams.set("order_status", options.status);
    }

    logger.debug("fetchOrders", { page, perPage, url: url.toString() });

    const raw = await this.fetchJson<unknown>(url.toString());
    if (!isRecord(raw)) {
      throw new Error("Zid orders response not an object");
    }

    const ordersRaw = raw.orders ?? raw.data ?? raw.items ?? [];
    const orders = Array.isArray(ordersRaw) ? (ordersRaw as ZidOrder[]) : [];

    const pagination = isRecord(raw.pagination)
      ? (raw.pagination as ZidPaginatedResponse<ZidOrder>["pagination"])
      : {};

    logger.debug("fetchOrders result", { page, count: orders.length, pagination });
    return { orders, pagination };
  }

  /**
   * Get order by ID
   * GET /managers/store/orders/{id}/view
   */
  async fetchOrder(orderId: string): Promise<ZidOrder | null> {
    const url = `${this.baseUrl}/managers/store/orders/${orderId}/view`;
    logger.debug("fetchOrder", { orderId, url });

    try {
      const raw = await this.fetchJson<unknown>(url);
      if (!isRecord(raw)) {
        return null;
      }
      return (raw.order ?? raw.data ?? raw) as ZidOrder;
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List product reviews
   * GET /managers/store/reviews/product/?page=...&page_size=...
   */
  async fetchReviews(
    page: number = 1,
    pageSize: number = 50,
    options?: {
      dateFrom?: string;
      dateTo?: string;
      status?: string;
    }
  ): Promise<ZidPaginatedResponse<ZidReview>> {
    const url = new URL("/managers/store/reviews/product/", this.baseUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(pageSize));

    if (options?.dateFrom) {
      url.searchParams.set("date_from", options.dateFrom);
    }
    if (options?.dateTo) {
      url.searchParams.set("date_to", options.dateTo);
    }
    if (options?.status) {
      url.searchParams.set("status", options.status);
    }

    logger.debug("fetchReviews", { page, pageSize, url: url.toString() });

    const raw = await this.fetchJson<unknown>(url.toString());
    if (!isRecord(raw)) {
      throw new Error("Zid reviews response not an object");
    }

    const reviewsRaw = raw.reviews ?? raw.data ?? raw.items ?? [];
    const reviews = Array.isArray(reviewsRaw) ? (reviewsRaw as ZidReview[]) : [];

    const pagination = isRecord(raw.pagination)
      ? (raw.pagination as ZidPaginatedResponse<ZidReview>["pagination"])
      : {};

    logger.debug("fetchReviews result", { page, count: reviews.length, pagination });
    return { reviews, pagination };
  }

  /**
   * Refresh access token
   * POST https://oauth.zid.sa/oauth/token
   */
  static async refreshToken(refreshToken: string): Promise<{
    authorizationToken: string | null;
    managerToken: string | null;
    refreshToken: string | null;
    expiresIn: number;
  }> {
    const zidConfig = getZidConfig();
    // IMPORTANT: Zid requires redirect_uri in refresh token request
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: zidConfig.clientId,
      client_secret: zidConfig.clientSecret,
      redirect_uri: zidConfig.redirectUri,
    });

    const response = await fetchWithTimeout(zidConfig.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Token refresh failed", {
        status: response.status,
        error: errorText.substring(0, 500),
      });
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    const expiresRaw = data.expires_in;
    const expiresIn =
      typeof expiresRaw === "number"
        ? expiresRaw
        : typeof expiresRaw === "string"
        ? Number(expiresRaw)
        : null;

    const expiresInValue =
      typeof expiresIn === "number" && Number.isFinite(expiresIn)
        ? expiresIn
        : 31536000; // Default to 1 year if not provided

    // Token mapping:
    // - authorization/Authorization → Bearer token for Authorization header
    // - access_token → X-Manager-Token header
    return {
      authorizationToken:
        data.Authorization ||
        data.authorization ||
        data.authorization_token ||
        data.authorizationToken ||
        null,
      managerToken:
        data.access_token ||
        data.manager_token ||
        data.accessToken ||
        null,
      refreshToken: data.refresh_token || data.refreshToken || null,
      expiresIn: expiresInValue,
    };
  }
}

function isTokenExpired(tokenExpiry: Date | null): boolean {
  if (!tokenExpiry) return false;
  return tokenExpiry.getTime() <= Date.now();
}

export async function ensureZidAccessToken(merchant: ZidMerchantAuth) {
  if (!isTokenExpired(merchant.zidTokenExpiry)) {
    return {
      authorizationToken: merchant.zidAccessToken,
      managerToken: merchant.zidManagerToken,
      refreshToken: merchant.zidRefreshToken,
      tokenExpiry: merchant.zidTokenExpiry,
    };
  }

  if (!merchant.zidRefreshToken) {
    throw new Error("Zid refresh token missing");
  }

  const refreshed = await ZidService.refreshToken(merchant.zidRefreshToken);
  const tokenExpiry = new Date(Date.now() + refreshed.expiresIn * 1000);
  const authorizationToken =
    refreshed.authorizationToken ?? merchant.zidAccessToken;
  const managerToken = refreshed.managerToken ?? merchant.zidManagerToken;
  const refreshToken = refreshed.refreshToken ?? merchant.zidRefreshToken;

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      zidAccessToken: authorizationToken,
      zidManagerToken: managerToken,
      zidRefreshToken: refreshToken,
      zidTokenExpiry: tokenExpiry,
    },
  });

  return {
    authorizationToken,
    managerToken,
    refreshToken,
    tokenExpiry,
  };
}

export async function deactivateZidProduct(
  merchantId: string,
  zidProductId: string
): Promise<void> {
  await prisma.product.updateMany({
    where: {
      merchantId,
      zidProductId,
    },
    data: {
      isActive: false,
      inStock: false,
    },
  });
}
