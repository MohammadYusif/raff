// src/lib/zid/getZidRedirectUri.ts
import type { NextRequest } from "next/server";
import { getZidConfig } from "@/lib/platform/config";

const ZID_CALLBACK_PATH = "/api/zid/oauth/callback";

const pickForwardedHost = (value: string | null) =>
  value ? value.split(",")[0]?.trim() || null : null;

const isLoopbackHost = (host: string) =>
  host === "localhost" ||
  host.startsWith("localhost:") ||
  host.startsWith("127.0.0.1") ||
  host.startsWith("::1");

/**
 * Production allowlist for trusted hostnames.
 * This prevents spoofed x-forwarded-host headers from affecting redirect_uri.
 */
const isAllowedProdHost = (hostname: string) => {
  // Your current Railway production domain:
  if (hostname === "raff-production-51f5.up.railway.app") return true;

  // Add custom domains later, e.g.:
  // if (hostname === "raff.sa") return true;
  // if (hostname === "www.raff.sa") return true;

  return false;
};

const getRequestOrigin = (request: NextRequest): string | null => {
  const forwardedHost = pickForwardedHost(
    request.headers.get("x-forwarded-host")
  );
  const forwardedProto = request.headers.get("x-forwarded-proto");

  const host = forwardedHost ?? request.headers.get("host");
  const proto = forwardedProto ?? null;

  if (host && proto) return `${proto}://${host}`;
  if (host) return `https://${host}`;

  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
};

// NOTE: This helper is for building authorize URLs, not for token exchange in production.
export function getZidRedirectUri(request?: NextRequest): string {
  const config = getZidConfig();
  const requestOrigin = request ? getRequestOrigin(request) : null;

  let trustedOrigin: string | null = null;

  if (requestOrigin) {
    try {
      const hostname = new URL(requestOrigin).hostname;

      if (process.env.NODE_ENV !== "production") {
        // In dev, allow request origin as long as it's valid.
        trustedOrigin = requestOrigin;
      } else if (!isLoopbackHost(hostname) && isAllowedProdHost(hostname)) {
        // In prod, only allow known hostnames.
        trustedOrigin = requestOrigin;
      }
    } catch {
      trustedOrigin = null;
    }
  }

  const baseUrl = trustedOrigin ?? config.appBaseUrl;
  const redirectUrl = new URL(ZID_CALLBACK_PATH, baseUrl).toString();

  if (
    process.env.NODE_ENV !== "production" &&
    config.redirectUri &&
    config.redirectUri !== redirectUrl
  ) {
    console.warn("[zid] ZID_REDIRECT_URI mismatch", {
      configured: config.redirectUri,
      computed: redirectUrl,
    });
  }

  return redirectUrl;
}
