// src/lib/platform/webhooks.ts
import crypto from "crypto";

const SENSITIVE_KEYS = [
  "authorization",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "signature",
  "password",
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.includes(key.toLowerCase());
}

export function maskSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(maskSensitive);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => [
        key,
        isSensitiveKey(key) ? "[redacted]" : maskSensitive(val),
      ]
    );
    return Object.fromEntries(entries);
  }
  return value;
}

export function getHeaderValue(
  headers: Headers,
  headerName?: string | null
): string | null {
  if (!headerName) return null;
  return headers.get(headerName);
}

export function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
