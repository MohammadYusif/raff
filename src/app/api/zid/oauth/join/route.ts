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
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const config = getZidConfig();

  // Generate a random state for CSRF protection
  const state = crypto.randomBytes(32).toString("hex");

  const redirectUri = getZidRedirectUri(request);
  console.info("[zid-oauth-join] initiating OAuth", {
    redirectUri,
    configuredRedirectUri: config.redirectUri,
    clientId: config.clientId,
    scopes: config.scopes,
  });

  // Build OAuth URL exactly like Zid's Flask example
  // Only: client_id, redirect_uri, response_type (no scope)
  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");

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
