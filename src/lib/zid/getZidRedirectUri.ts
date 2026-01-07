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

const getRequestOrigin = (request: NextRequest): string | null => {
  const forwardedHost = pickForwardedHost(
    request.headers.get("x-forwarded-host")
  );
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  const proto =
    forwardedProto ||
    request.headers.get("x-forwarded-protocol") ||
    null;

  if (host && proto) {
    return `${proto}://${host}`;
  }

  if (host) {
    return `https://${host}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
};

export function getZidRedirectUri(request?: NextRequest): string {
  const config = getZidConfig();
  const requestOrigin = request ? getRequestOrigin(request) : null;
  const fallbackBaseUrl = config.appBaseUrl;
  const baseUrl =
    requestOrigin &&
    (process.env.NODE_ENV !== "production" ||
      !isLoopbackHost(new URL(requestOrigin).hostname))
      ? requestOrigin
      : fallbackBaseUrl;
  const redirectUrl = new URL(ZID_CALLBACK_PATH, baseUrl);

  if (
    process.env.NODE_ENV !== "production" &&
    config.redirectUri &&
    config.redirectUri !== redirectUrl.toString()
  ) {
    console.warn("[zid] ZID_REDIRECT_URI mismatch", {
      configured: config.redirectUri,
      computed: redirectUrl.toString(),
    });
  }

  return redirectUrl.toString();
}
