// src/lib/integrations/salla/client.ts
import { fetchWithTimeout } from "@/lib/platform/fetch";

type QueryValue = string | number | undefined;

type SallaEnvelope = {
  status?: number;
  success?: boolean;
  data?: unknown;
};

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
}): Promise<T> {
  const baseUrl = args.baseUrl ?? "https://api.salla.dev";
  const normalizedPath = args.path.startsWith("/")
    ? args.path
    : `/${args.path}`;
  const url = `${baseUrl}${normalizedPath}${buildQuery(args.query)}`;

  const response = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${args.token}`,
      Accept: "application/json",
    },
  });

  const bodyText = await response.text();
  let parsed: unknown;

  try {
    parsed = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    throw new Error(
      `Salla API invalid JSON (${response.status}): ${bodyText || "empty"}`
    );
  }

  if (!response.ok) {
    throw new Error(`Salla API error ${response.status}: ${bodyText}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Salla API invalid response: ${bodyText || "empty"}`);
  }

  const envelope = parsed as SallaEnvelope;
  if (envelope.success !== true || envelope.data === undefined || envelope.data === null) {
    throw new Error(`Salla API response not successful: ${bodyText}`);
  }

  return parsed as T;
}
