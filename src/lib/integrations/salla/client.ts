// src/lib/integrations/salla/client.ts
import { fetchWithTimeout } from "@/lib/platform/fetch";

type QueryValue = string | number | undefined;

type SallaEnvelope = {
  status?: number;
  success?: boolean;
  data?: unknown;
};

export type SallaRateLimitInfo = {
  url: string;
  retryAfterMs: number | null;
  attempt: number;
};

export type SallaRequestOptions = {
  onUnauthorized?: () => Promise<string | null>;
  onRateLimit?: (info: SallaRateLimitInfo) => void;
  maxAttempts?: number;
};

const MAX_RETRY_DELAY_MS = 30000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) {
      return Math.min(Math.max(seconds * 1000, 0), MAX_RETRY_DELAY_MS);
    }

    const dateMs = Date.parse(retryAfter);
    if (!Number.isNaN(dateMs)) {
      return Math.min(
        Math.max(dateMs - Date.now(), 0),
        MAX_RETRY_DELAY_MS
      );
    }
  }

  const baseDelayMs = 500;
  return Math.min(baseDelayMs * Math.pow(2, attempt), MAX_RETRY_DELAY_MS);
}

function buildQuery(
  query?: Record<string, QueryValue>
): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Salla API fetch helper with strict envelope validation and error reporting.
 */
export async function sallaFetch<T>(args: {
  token: string;
  path: string;
  query?: Record<string, QueryValue>;
  baseUrl?: string;
  onUnauthorized?: SallaRequestOptions["onUnauthorized"];
  onRateLimit?: SallaRequestOptions["onRateLimit"];
  maxAttempts?: number;
}): Promise<T> {
  const baseUrl = args.baseUrl ?? "https://api.salla.dev";
  const normalizedPath = args.path.startsWith("/")
    ? args.path
    : `/${args.path}`;
  const url = `${baseUrl}${normalizedPath}${buildQuery(args.query)}`;
  const maxAttempts = Math.max(1, args.maxAttempts ?? 2);
  let attempt = 0;
  let token = args.token;

  while (attempt < maxAttempts) {
    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401 && args.onUnauthorized && attempt === 0) {
        await response.body?.cancel();
        const refreshed = await args.onUnauthorized();
        if (refreshed) {
          token = refreshed;
          attempt += 1;
          continue;
        }
      }

      if (response.status === 429 && attempt + 1 < maxAttempts) {
        const retryAfterMs = getRetryDelayMs(response, attempt);
        await response.body?.cancel();
        args.onRateLimit?.({
          url,
          retryAfterMs,
          attempt: attempt + 1,
        });
        await sleep(retryAfterMs);
        attempt += 1;
        continue;
      }

      const bodyText = await response.text();
      throw new Error(`Salla API error ${response.status}: ${bodyText}`);
    }

    const bodyText = await response.text();
    let parsed: unknown;

    try {
      parsed = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      throw new Error(
        `Salla API invalid JSON (${response.status}): ${bodyText || "empty"}`
      );
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Salla API invalid response: ${bodyText || "empty"}`);
    }

    const envelope = parsed as SallaEnvelope;
    if (
      envelope.success !== true ||
      envelope.data === undefined ||
      envelope.data === null
    ) {
      throw new Error(`Salla API response not successful: ${bodyText}`);
    }

    return parsed as T;
  }

  throw new Error("Salla API request failed after retries");
}

export async function sallaFetchUrl<T>(args: {
  token: string;
  url: string;
  query?: Record<string, QueryValue>;
  requestOptions?: SallaRequestOptions;
}): Promise<T> {
  const parsed = new URL(args.url);
  const baseUrl = `${parsed.protocol}//${parsed.host}`;
  const query: Record<string, QueryValue> = {};

  for (const [key, value] of parsed.searchParams.entries()) {
    query[key] = value;
  }

  if (args.query) {
    for (const [key, value] of Object.entries(args.query)) {
      if (value === undefined) continue;
      query[key] = value;
    }
  }

  return sallaFetch<T>({
    token: args.token,
    baseUrl,
    path: parsed.pathname,
    query,
    ...args.requestOptions,
  });
}
