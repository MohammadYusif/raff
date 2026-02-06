// src/app/api/zid/oauth/join/route.ts
/**
 * Zid OAuth Join Flow - Start
 *
 * This endpoint initiates OAuth for NEW merchants joining Raff.
 * Unlike the regular OAuth flow, this doesn't require authentication.
 *
 * Flow:
 * 1. Generate OAuth state (without merchantId since account doesn't exist yet)
 * 2. Redirect to Zid authorization page
 * 3. User authorizes
 * 4. Zid redirects back to /api/zid/oauth/callback with code
 */

import { NextRequest, NextResponse } from "next/server";
import { getZidConfig } from "@/lib/platform/config";
import { getZidRedirectUri } from "@/lib/zid/getZidRedirectUri";
import { parseZidOAuthScopes } from "@/lib/zid/getZidOAuthScopes";
import crypto from "crypto";
import { createLogger } from "@/lib/utils/logger";


const logger = createLogger("api-zid-oauth-join");

const redirectInvalidScopes = (config: ReturnType<typeof getZidConfig>) => {
  const url = new URL("/merchant/join", config.appBaseUrl);
  url.searchParams.set("zid", "error");
  url.searchParams.set("error", "invalid_scopes");
  return NextResponse.redirect(url);
};

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";

  // Zid's server verification check (Ruby user agent, no browser)
  // Return 200 OK so Zid knows the endpoint is reachable
  if (userAgent.toLowerCase().includes("ruby") || !userAgent) {
    console.info("[zid-oauth-join] Zid server verification check - returning OK");
    return NextResponse.json({ status: "ok" });
  }

  const config = getZidConfig();

  // Generate a random state for CSRF protection
  const state = crypto.randomBytes(32).toString("hex");

  const redirectUri = getZidRedirectUri(request);
  const { scopes, invalid } = parseZidOAuthScopes();
  console.info("[zid-oauth-join] scopes", {
    scopes,
    invalid,
    hasScopes: scopes.length > 0,
  });
  if (invalid.length > 0) {
    logger.error("[zid-oauth-join] invalid scopes", { invalid, scopes });
    return redirectInvalidScopes(config);
  }

  // Build OAuth URL exactly like Zid's Flask example
  // Only add scope when explicitly configured; otherwise rely on dashboard permissions.
  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  if (scopes.length > 0) {
    url.searchParams.set("scope", scopes.join(" "));
  }

  const response = NextResponse.redirect(url.toString());

  // Store state in cookie with a flag indicating this is a join flow
  response.cookies.set("raff_zid_join_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Flag to indicate this is a new merchant join flow
  response.cookies.set("raff_zid_join_flow", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
