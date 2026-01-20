// src/lib/services/zidApi.ts
//
// Zid API Token Mapping (from OAuth response):
// - authorization (or Authorization) → Bearer token for Authorization header
// - access_token → X-Manager-Token header (also called manager token)
//
// DB field mapping:
// - zidAccessToken → stores the AUTHORIZATION token (Bearer)
// - zidManagerToken → stores the MANAGER token (X-Manager-Token / Access-Token)
//
// Every Zid API request MUST send BOTH:
// - Authorization: Bearer <authorization_token>
// - X-Manager-Token: <manager_token>

import { getZidConfig } from "@/lib/platform/config";
import { fetchWithTimeout } from "@/lib/platform/fetch";
import { normalizeZidAuthorizationToken } from "@/lib/zid/tokens";

type ZidRole = "Manager" | "Customer";
type QueryValue = string | number | boolean | undefined | null;

/**
 * Zid merchant headers for API requests
 *
 * Token naming convention:
 * - zidAccessToken: The AUTHORIZATION token (goes in Authorization: Bearer header)
 * - zidManagerToken: The MANAGER token (goes in X-Manager-Token / Access-Token headers)
 */
export type ZidMerchantHeaders = {
  id: string;
  /** Authorization token - used in "Authorization: Bearer <token>" header */
  zidAccessToken: string | null;
  /** Manager token - used in "X-Manager-Token" and "Access-Token" headers */
  zidManagerToken: string | null;
  zidStoreId: string | null;
};

export type ZidListProductsParams = {
  page?: number;
  pageSize?: number;
  ordering?: "created_at" | "updated_at";
  extended?: boolean;
};

const shouldDebug = process.env.NODE_ENV !== "production";
const debugLog = (message: string, details?: Record<string, unknown>) => {
  if (!shouldDebug) return;
  if (details) {
    console.debug("[zid-api]", message, details);
    return;
  }
  console.debug("[zid-api]", message);
};

const LOG_BODY_LIMIT = 500;

const tokenPrefix = (value: string | null | undefined) =>
  value ? value.slice(0, 6) : null;

const formatBodySnippet = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "empty";
  const truncated =
    trimmed.length > LOG_BODY_LIMIT ? trimmed.slice(0, LOG_BODY_LIMIT) : trimmed;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(trimmed)).slice(0, LOG_BODY_LIMIT);
    } catch {
      return truncated;
    }
  }
  return truncated;
};

const requireValue = (value: string | null | undefined, label: string) => {
  if (!value) {
    throw new Error(`Zid ${label} missing`);
  }
  return value;
};

const buildQuery = (query?: Record<string, QueryValue>) => {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

const buildZidUrl = (path: string) => {
  const base = getZidConfig().apiBaseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

type ZidHeaderOptions = {
  role?: ZidRole;
  acceptLanguage?: string;
  skipStoreId?: boolean;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
};

const buildZidHeaders = (
  merchant: ZidMerchantHeaders,
  options?: ZidHeaderOptions
): Record<string, string> => {
  // Authorization token (Bearer) - REQUIRED
  const authorizationToken = requireValue(
    normalizeZidAuthorizationToken(merchant.zidAccessToken),
    "authorization token (zidAccessToken)"
  );

  // Manager token - REQUIRED for all Zid API requests per documentation
  const managerToken = requireValue(
    merchant.zidManagerToken,
    "manager token (zidManagerToken)"
  );

  const headers: Record<string, string> = {
    // Authorization header uses the authorization token
    Authorization: `Bearer ${authorizationToken}`,
    // Manager token is ALWAYS required for Zid API
    "X-Manager-Token": managerToken,
    "Access-Token": managerToken, // Some endpoints use this instead
    Accept: "application/json",
  };

  // Only set Content-Type for requests with body (POST/PUT/PATCH)
  const method = options?.method ?? "GET";
  if (method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }

  // Store-Id is required for most endpoints, but not for profile endpoint
  if (!options?.skipStoreId && merchant.zidStoreId) {
    headers["Store-Id"] = String(merchant.zidStoreId);
  }

  // Role header for manager endpoints
  if (options?.role) {
    headers.Role = options.role;
  }

  // Accept-Language for localization (don't send empty string)
  if (options?.acceptLanguage && options.acceptLanguage.trim()) {
    headers["Accept-Language"] = options.acceptLanguage;
  }

  debugLog("headers", {
    role: options?.role ?? null,
    method,
    hasAuthorizationToken: Boolean(authorizationToken),
    authorizationTokenPrefix: tokenPrefix(authorizationToken),
    hasManagerToken: Boolean(merchant.zidManagerToken),
    managerTokenPrefix: tokenPrefix(merchant.zidManagerToken),
    storeId: merchant.zidStoreId ?? null,
    acceptLanguage: options?.acceptLanguage ?? null,
    skipStoreId: options?.skipStoreId ?? false,
  });

  return headers;
};

const parseJsonBody = async (response: Response): Promise<unknown> => {
  const bodyText = await response.text();
  if (!bodyText) return null;
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    throw new Error(
      `Zid API invalid JSON (${response.status}): ${bodyText.substring(0, 200) || "empty"}`
    );
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Parse error body and extract structured error info if available */
const parseErrorBody = async (
  response: Response
): Promise<{ text: string; code?: string; message?: string }> => {
  const bodyText = await response.text().catch(() => "");
  const text = formatBodySnippet(bodyText);

  try {
    const json = JSON.parse(bodyText) as Record<string, unknown>;
    // Zid may return { error: { code, message } } or { code, message } or { error: "..." }
    const errorObj = (json.error as Record<string, unknown>) || json;
    return {
      text,
      code:
        (errorObj.code as string) || (json.error_code as string) || undefined,
      message:
        (errorObj.message as string) ||
        (json.error as string) ||
        (json.detail as string) ||
        undefined,
    };
  } catch {
    return { text };
  }
};

/** Parse Retry-After header (seconds or HTTP-date) → milliseconds */
const parseRetryAfter = (header: string | null, defaultMs: number): number => {
  if (!header) return defaultMs;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) {
    return Math.min(Math.max(seconds * 1000, 0), 60000);
  }
  // HTTP-date format (rare but possible)
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const delayMs = Math.max(date - Date.now(), 0);
    return Math.min(delayMs, 60000);
  }
  return defaultMs;
};

/**
 * Fetch JSON from Zid API with retry/backoff for 429 and 5xx errors
 *
 * Rate limiting: Zid product endpoints allow 60 requests/minute per store
 * Uses exponential backoff with jitter on failures
 */
const zidFetchJson = async (args: {
  merchant: ZidMerchantHeaders;
  path: string;
  query?: Record<string, QueryValue>;
  role?: ZidRole;
  acceptLanguage?: string;
  skipStoreId?: boolean;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Total number of attempts (1 = no retry, 3 = 2 retries). Default: 3 */
  maxAttempts?: number;
}): Promise<unknown> => {
  const url = `${buildZidUrl(args.path)}${buildQuery(args.query)}`;
  const method = args.method ?? "GET";
  const maxAttempts = args.maxAttempts ?? 3;

  debugLog("request", {
    path: args.path,
    url,
    method,
    role: args.role ?? null,
    skipStoreId: args.skipStoreId ?? false,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const headers = buildZidHeaders(args.merchant, {
      role: args.role,
      acceptLanguage: args.acceptLanguage,
      skipStoreId: args.skipStoreId,
      method,
    });

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Only add body for non-GET/DELETE requests when body is provided
    if (method !== "GET" && method !== "DELETE" && args.body !== undefined) {
      fetchOptions.body = JSON.stringify(args.body);
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(url, fetchOptions);
    } catch (fetchError) {
      // Network error or timeout - retry with backoff
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000) + Math.random() * 500;
      lastError = fetchError instanceof Error
        ? fetchError
        : new Error(`Zid API fetch failed: ${String(fetchError)}`);

      debugLog("fetch-error", {
        url,
        attempt: attempt + 1,
        error: lastError.message,
        backoffMs,
      });

      if (attempt + 1 < maxAttempts) {
        await sleep(backoffMs);
        continue;
      }
      break;
    }

    if (response.ok) {
      return parseJsonBody(response);
    }

    const errorBody = await parseErrorBody(response);
    if (
      response.status === 401 ||
      response.status === 403 ||
      args.path === "/managers/account/profile"
    ) {
      console.error("[zid-api] request failed", {
        status: response.status,
        path: args.path,
        baseUrl: getZidConfig().apiBaseUrl,
        hasAuthorizationHeader: Boolean(headers.Authorization),
        hasManagerTokenHeader: Boolean(
          headers["X-Manager-Token"] || headers["Access-Token"]
        ),
        authorizationTokenPrefix: tokenPrefix(
          normalizeZidAuthorizationToken(args.merchant.zidAccessToken)
        ),
        managerTokenPrefix: tokenPrefix(args.merchant.zidManagerToken),
        error: errorBody.text,
      });
    }

    // Handle 429 - Rate limiting
    if (response.status === 429) {
      const errorDetail = errorBody.message || errorBody.code || errorBody.text;
      lastError = new Error(`Zid API rate limited (429): ${errorDetail}`);

      // Exponential backoff with jitter as default
      const baseDelay = 1000 * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const defaultBackoff = Math.min(baseDelay + jitter, 60000);
      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"), defaultBackoff);

      debugLog("rate-limited", {
        url,
        attempt: attempt + 1,
        retryAfterMs,
        errorCode: errorBody.code,
        errorMessage: errorBody.message,
      });

      if (attempt + 1 < maxAttempts) {
        await sleep(retryAfterMs);
        continue;
      }
      break;
    }

    // Handle 5xx - Server errors
    if (response.status >= 500) {
      const errorDetail = errorBody.message || errorBody.code || errorBody.text;
      lastError = new Error(`Zid API server error (${response.status}): ${errorDetail}`);

      // Check Retry-After header (some APIs send it on 503/502)
      // Fall back to exponential backoff with jitter
      const baseDelay = Math.min(1000 * Math.pow(2, attempt), 30000);
      const jitter = Math.random() * 500;
      const defaultBackoff = baseDelay + jitter;
      const backoffMs = parseRetryAfter(response.headers.get("retry-after"), defaultBackoff);

      debugLog("server-error", {
        url,
        status: response.status,
        attempt: attempt + 1,
        backoffMs,
        errorCode: errorBody.code,
        errorMessage: errorBody.message,
      });

      if (attempt + 1 < maxAttempts) {
        await sleep(backoffMs);
        continue;
      }
      break;
    }

    // For other errors (4xx except 429), don't retry
    const errorDetail = errorBody.message || errorBody.code || errorBody.text;
    lastError = new Error(`Zid API error ${response.status}: ${errorDetail}`);

    // Don't retry client errors (except 429 which is handled above)
    if (response.status >= 400 && response.status < 500) {
      throw lastError;
    }
  }

  throw lastError ?? new Error("Zid API request failed after retries");
};

export async function zidListProducts(
  merchant: ZidMerchantHeaders,
  params?: ZidListProductsParams
): Promise<unknown> {
  const extended = params?.extended ?? true;
  return zidFetchJson({
    merchant,
    path: "/products/",
    query: {
      page: params?.page,
      page_size: params?.pageSize,
      ordering: params?.ordering,
      extended,
    },
    role: "Manager",
  });
}

export async function zidRetrieveProduct(
  merchant: ZidMerchantHeaders,
  productId: string,
  options: { role: ZidRole }
): Promise<unknown> {
  if (!productId) {
    throw new Error("Zid product id missing");
  }
  return zidFetchJson({
    merchant,
    path: `/products/${encodeURIComponent(productId)}/`,
    role: options.role,
  });
}

export async function zidListCategories(
  merchant: ZidMerchantHeaders,
  options?: { acceptLanguage?: string }
): Promise<unknown> {
  return zidFetchJson({
    merchant,
    path: "/managers/store/categories",
    role: "Manager",
    acceptLanguage: options?.acceptLanguage,
  });
}

export async function zidRetrieveCategory(
  merchant: ZidMerchantHeaders,
  categoryId: string,
  options?: { acceptLanguage?: string }
): Promise<unknown> {
  if (!categoryId) {
    throw new Error("Zid category id missing");
  }
  return zidFetchJson({
    merchant,
    path: `/managers/store/categories/${encodeURIComponent(categoryId)}/view`,
    role: "Manager",
    acceptLanguage: options?.acceptLanguage,
  });
}

/**
 * Fetch manager account profile
 * GET /managers/account/profile
 *
 * This endpoint returns store info and doesn't require Store-Id header.
 * Use this to get store_id after OAuth.
 */
export async function zidFetchManagerProfile(
  merchant: Omit<ZidMerchantHeaders, "zidStoreId"> & { zidStoreId?: string | null }
): Promise<unknown> {
  return zidFetchJson({
    merchant: {
      ...merchant,
      zidStoreId: merchant.zidStoreId ?? null,
    },
    path: "/managers/account/profile",
    role: "Manager",
    skipStoreId: true, // Profile endpoint doesn't need Store-Id
  });
}

/**
 * Fetch orders with pagination
 * GET /managers/store/orders?payload_type=default
 */
export async function zidListOrders(
  merchant: ZidMerchantHeaders,
  params?: {
    page?: number;
    perPage?: number;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }
): Promise<unknown> {
  return zidFetchJson({
    merchant,
    path: "/managers/store/orders",
    query: {
      payload_type: "default", // REQUIRED to include products
      page: params?.page,
      per_page: params?.perPage,
      date_from: params?.dateFrom,
      date_to: params?.dateTo,
      order_status: params?.status,
    },
    role: "Manager",
  });
}

/**
 * Fetch single order by ID
 * GET /managers/store/orders/{id}/view
 */
export async function zidRetrieveOrder(
  merchant: ZidMerchantHeaders,
  orderId: string
): Promise<unknown> {
  if (!orderId) {
    throw new Error("Zid order id missing");
  }
  return zidFetchJson({
    merchant,
    path: `/managers/store/orders/${encodeURIComponent(orderId)}/view`,
    role: "Manager",
  });
}

/**
 * Fetch product reviews with pagination
 * GET /managers/store/reviews/product/
 */
export async function zidListReviews(
  merchant: ZidMerchantHeaders,
  params?: {
    page?: number;
    pageSize?: number;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }
): Promise<unknown> {
  return zidFetchJson({
    merchant,
    path: "/managers/store/reviews/product/",
    query: {
      page: params?.page,
      page_size: params?.pageSize,
      date_from: params?.dateFrom,
      date_to: params?.dateTo,
      status: params?.status,
    },
    role: "Manager",
  });
}
