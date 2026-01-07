// src/lib/services/zidApi.ts
import { getZidConfig } from "@/lib/platform/config";
import { fetchWithTimeout } from "@/lib/platform/fetch";

type ZidRole = "Manager" | "Customer";
type QueryValue = string | number | boolean | undefined | null;

export type ZidMerchantHeaders = {
  id: string;
  zidAccessToken: string | null;
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

const tokenPrefix = (value: string | null | undefined) =>
  value ? value.slice(0, 6) : null;

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
};

const buildZidHeaders = (
  merchant: ZidMerchantHeaders,
  options?: ZidHeaderOptions
): Record<string, string> => {
  const accessToken = requireValue(
    merchant.zidAccessToken,
    "authorization token"
  );
  const storeId = requireValue(merchant.zidStoreId, "store id");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Store-Id": String(storeId),
  };

  if (options?.role) {
    headers.Role = options.role;
  }

  if (options?.role === "Manager") {
    const managerToken = requireValue(merchant.zidManagerToken, "manager token");
    headers["X-Manager-Token"] = managerToken;
  }

  if (options?.acceptLanguage) {
    headers["Accept-Language"] = options.acceptLanguage;
  }

  debugLog("headers", {
    role: options?.role ?? null,
    hasAccessToken: Boolean(merchant.zidAccessToken),
    accessTokenPrefix: tokenPrefix(merchant.zidAccessToken),
    hasManagerToken: Boolean(merchant.zidManagerToken),
    managerTokenPrefix: tokenPrefix(merchant.zidManagerToken),
    storeId: merchant.zidStoreId ?? null,
    acceptLanguage: options?.acceptLanguage ?? null,
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
      `Zid API invalid JSON (${response.status}): ${bodyText || "empty"}`
    );
  }
};

const zidFetchJson = async (args: {
  merchant: ZidMerchantHeaders;
  path: string;
  query?: Record<string, QueryValue>;
  role?: ZidRole;
  acceptLanguage?: string;
}): Promise<unknown> => {
  const url = `${buildZidUrl(args.path)}${buildQuery(args.query)}`;
  debugLog("request", {
    path: args.path,
    url,
    role: args.role ?? null,
  });
  const response = await fetchWithTimeout(url, {
    headers: buildZidHeaders(args.merchant, {
      role: args.role,
      acceptLanguage: args.acceptLanguage,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `Zid API error ${response.status}: ${bodyText || "empty"}`
    );
  }

  return parseJsonBody(response);
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
