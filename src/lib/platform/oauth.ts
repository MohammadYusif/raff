// src/lib/platform/oauth.ts
import crypto from "crypto";

function base64UrlEncode(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const paddedValue = padded + "=".repeat(padLength);
  return Buffer.from(paddedValue, "base64").toString("utf-8");
}

function signState(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createOAuthState<T>(
  payload: T,
  secret: string
): string {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signState(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifyOAuthState<T>(
  state: string,
  secret: string
): T | null {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;

  const expected = signState(encoded, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encoded)) as T;
  } catch {
    return null;
  }
}
