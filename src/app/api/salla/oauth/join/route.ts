// src/app/api/salla/oauth/join/route.ts
/**
 * Salla OAuth Join Flow - Start
 *
 * This endpoint initiates OAuth for NEW merchants joining Raff.
 * Unlike the regular OAuth flow, this doesn't require authentication.
 *
 * Flow:
 * 1. Generate OAuth state (without merchantId since account doesn't exist yet)
 * 2. Redirect to Salla authorization page
 * 3. User authorizes
 * 4. Salla redirects back to /api/salla/oauth/callback with code
 */

import { NextResponse } from "next/server";
import { getSallaConfig } from "@/lib/platform/config";
import crypto from "crypto";

export async function GET() {
  const config = getSallaConfig();

  // Generate a random state for CSRF protection
  // We'll use this to verify the callback, but won't include merchantId
  // since the merchant account doesn't exist yet
  const state = crypto.randomBytes(32).toString("hex");

  const url = new URL(config.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set(
    "redirect_uri",
    `${config.appBaseUrl}/api/salla/oauth/callback`
  );
  if (config.scopes.length) {
    url.searchParams.set("scope", config.scopes.join(" "));
  }
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url.toString());

  // Store state in cookie with a flag indicating this is a join flow
  response.cookies.set("raff_salla_join_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Flag to indicate this is a new merchant join flow
  response.cookies.set("raff_salla_join_flow", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
