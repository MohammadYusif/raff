type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitState>();

export function rateLimit(
  key: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.max - 1, resetAt };
  }

  existing.count += 1;
  buckets.set(key, existing);

  const remaining = Math.max(options.max - existing.count, 0);
  const allowed = existing.count <= options.max;

  return { allowed, remaining, resetAt: existing.resetAt };
}

export function getRequestIp(
  headers?: Headers | Record<string, string | string[] | undefined>
): string {
  if (!headers) return "unknown";

  if (headers instanceof Headers) {
    const forwarded = headers.get("x-forwarded-for");
    const realIp = headers.get("x-real-ip");
    const candidate = forwarded || realIp;
    return candidate ? candidate.split(",")[0].trim() : "unknown";
  }

  const forwarded =
    headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  const realIp = headers["x-real-ip"] || headers["X-Real-IP"];
  const candidate =
    Array.isArray(forwarded) ? forwarded[0] : forwarded || realIp;

  return candidate ? String(candidate).split(",")[0].trim() : "unknown";
}
