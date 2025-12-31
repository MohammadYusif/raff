type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitState>();

// prune occasionally
let lastPruneAt = 0;
const PRUNE_EVERY_MS = 60_000; // 1 min
const MAX_BUCKETS = 50_000; // safety cap (tune)

function prune(now: number) {
  if (now - lastPruneAt < PRUNE_EVERY_MS) return;
  lastPruneAt = now;

  // Remove expired
  for (const [key, value] of buckets) {
    if (now >= value.resetAt) buckets.delete(key);
  }

  // Hard cap: if still too big, delete oldest-ish by resetAt
  if (buckets.size > MAX_BUCKETS) {
    const entries = Array.from(buckets.entries());
    entries.sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toDelete = buckets.size - MAX_BUCKETS;
    for (let i = 0; i < toDelete; i += 1) {
      buckets.delete(entries[i]![0]);
    }
  }
}

export function rateLimit(
  key: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  prune(now);
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

function stripPort(input: string): string {
  if (input.startsWith("[") && input.includes("]")) {
    return input.slice(1, input.indexOf("]"));
  }
  if (input.includes(".") && input.includes(":")) {
    return input.split(":")[0];
  }
  return input;
}

function isValidIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

function isValidIpv6(value: string): boolean {
  return /^[0-9a-fA-F:]+$/.test(value) && value.includes(":");
}

function isPrivateIp(value: string): boolean {
  if (isValidIpv4(value)) {
    const [a, b] = value.split(".").map((part) => Number(part));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }

  const normalized = value.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  return false;
}

function parseCandidateIp(value: string | null): string | null {
  if (!value) return null;
  const candidates = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(stripPort)
    .filter((item) => isValidIpv4(item) || isValidIpv6(item));

  const publicCandidate = candidates.find((item) => !isPrivateIp(item));
  return publicCandidate ?? candidates[0] ?? null;
}

export function getRequestIp(
  headers?: Headers | Record<string, string | string[] | undefined>
): string {
  if (!headers) return "unknown";

  if (headers instanceof Headers) {
    const vercelForwarded = headers.get("x-vercel-forwarded-for");
    const forwarded = headers.get("x-forwarded-for");
    const realIp = headers.get("x-real-ip");
    const candidate = parseCandidateIp(vercelForwarded || forwarded || realIp);
    return candidate ?? "unknown";
  }

  const vercelForwarded =
    headers["x-vercel-forwarded-for"] || headers["X-Vercel-Forwarded-For"];
  const forwarded =
    headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  const realIp = headers["x-real-ip"] || headers["X-Real-IP"];
  const candidate =
    Array.isArray(vercelForwarded)
      ? vercelForwarded[0]
      : vercelForwarded || forwarded || realIp;

  const parsed = parseCandidateIp(candidate ? String(candidate) : null);
  return parsed ?? "unknown";
}
