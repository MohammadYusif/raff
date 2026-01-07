// src/app/api/zid/oauth/debug/route.ts
/**
 * Zid OAuth Debug Endpoint
 * Visit this endpoint to see the current OAuth configuration
 * WARNING: Remove or protect this endpoint in production
 */

import { NextRequest, NextResponse } from "next/server";
import { getZidConfig } from "@/lib/platform/config";
import { getZidRedirectUri } from "@/lib/zid/getZidRedirectUri";

export async function GET(request: NextRequest) {
  const config = getZidConfig();
  const computedRedirectUri = getZidRedirectUri(request);

  // Don't expose secrets, just show lengths
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    config: {
      authUrl: config.authUrl,
      tokenUrl: config.tokenUrl,
      apiBaseUrl: config.apiBaseUrl,
      clientId: config.clientId,
      clientSecretLength: config.clientSecret?.length || 0,
      redirectUri: config.redirectUri,
      appBaseUrl: config.appBaseUrl,
      appId: config.appId || "NOT SET",
      scopes: config.scopes,
      scopesCount: config.scopes.length,
    },
    computed: {
      redirectUri: computedRedirectUri,
      redirectUriMatchesConfig: computedRedirectUri === config.redirectUri,
    },
    request: {
      url: request.url,
      origin: getRequestOrigin(request),
      headers: {
        host: request.headers.get("host"),
        "x-forwarded-host": request.headers.get("x-forwarded-host"),
        "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
      },
    },
    oauthUrl: buildOAuthUrl(config, computedRedirectUri),
  };

  return NextResponse.json(debugInfo, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function buildOAuthUrl(
  config: ReturnType<typeof getZidConfig>,
  redirectUri: string
): string {
  const url = new URL(config.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  if (config.scopes.length) {
    url.searchParams.set("scope", config.scopes.join(" "));
  }
  url.searchParams.set("state", "DEBUG_STATE_PLACEHOLDER");
  return url.toString();
}

function getRequestOrigin(request: NextRequest): string | null {
  const forwardedHost = request.headers.get("x-forwarded-host");
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
}
