// src/app/api/zid/oauth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getZidRedirectUri } from "@/lib/zid/getZidRedirectUri";

export async function GET(request: NextRequest) {
  const callbackUrl = new URL(getZidRedirectUri(request));
  callbackUrl.search = request.nextUrl.search;
  return NextResponse.redirect(callbackUrl.toString());
}
