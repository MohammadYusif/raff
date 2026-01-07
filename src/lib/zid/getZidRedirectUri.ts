// src/lib/zid/getZidRedirectUri.ts
import type { NextRequest } from "next/server";
import { getZidConfig } from "@/lib/platform/config";

const ZID_CALLBACK_PATH = "/api/zid/oauth/callback";

export function getZidRedirectUri(request?: NextRequest): string {
  const config = getZidConfig();
  const requestOrigin = request
    ? new URL(request.url).origin
    : null;
  const baseUrl = requestOrigin ?? config.appBaseUrl;
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
