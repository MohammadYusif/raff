// src/lib/utils/cookies.ts
/**
 * Cookie Utilities
 *
 * Provides functions for managing session cookies.
 * Session cookies expire when the browser tab/window closes.
 */

export interface CookieOptions {
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  maxAge?: number; // in seconds
}

/**
 * Set a cookie
 * For session cookies (expire on tab close), don't set maxAge or expires
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  if (typeof window === "undefined") return;

  const {
    path = "/",
    domain,
    secure = true, // Always use secure in production
    sameSite = "lax",
    maxAge,
  } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookieString += `; path=${path}`;

  if (domain) {
    cookieString += `; domain=${domain}`;
  }

  if (secure) {
    cookieString += "; secure";
  }

  cookieString += `; samesite=${sameSite}`;

  // Only set maxAge if provided (for persistent cookies)
  // Session cookies don't have maxAge/expires
  if (maxAge !== undefined) {
    cookieString += `; max-age=${maxAge}`;
  }

  document.cookie = cookieString;
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;

  const cookies = document.cookie.split(";");
  const cookie = cookies.find((c) =>
    c.trim().startsWith(`${encodeURIComponent(name)}=`)
  );

  if (!cookie) return null;

  const value = cookie.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string, options: CookieOptions = {}): void {
  if (typeof window === "undefined") return;

  const { path = "/", domain } = options;

  // Set maxAge to 0 to delete
  setCookie(name, "", { ...options, maxAge: 0, path, domain });
}

/**
 * Check if a cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}
