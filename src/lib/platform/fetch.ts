const DEFAULT_TIMEOUT_MS = Number(
  process.env.PLATFORM_FETCH_TIMEOUT_MS ?? "5000"
);
const DEFAULT_MAX_RETRIES = Number(
  process.env.PLATFORM_FETCH_MAX_RETRIES ?? "1"
);
const DEFAULT_RETRY_DELAY_MS = Number(
  process.env.PLATFORM_FETCH_RETRY_DELAY_MS ?? "250"
);
const MAX_RETRY_DELAY_MS = Number(
  process.env.PLATFORM_FETCH_MAX_RETRY_DELAY_MS ?? "30000"
);
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(
  response: Response,
  baseDelayMs: number,
  attempt: number
): number {
  let delayMs = baseDelayMs * Math.pow(2, attempt);
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) {
      delayMs = seconds * 1000;
      return Math.min(Math.max(delayMs, 0), MAX_RETRY_DELAY_MS);
    }

    const dateMs = Date.parse(retryAfter);
    if (!Number.isNaN(dateMs)) {
      delayMs = dateMs - Date.now();
      return Math.min(Math.max(delayMs, 0), MAX_RETRY_DELAY_MS);
    }
  }

  return Math.min(Math.max(delayMs, 0), MAX_RETRY_DELAY_MS);
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === "AbortError" ||
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("socket hang up")
  );
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const callerSignal = init.signal;
    let abortListener: (() => void) | null = null;

    if (callerSignal) {
      abortListener = () => controller.abort();
      if (callerSignal.aborted) {
        controller.abort();
      } else {
        callerSignal.addEventListener("abort", abortListener);
      }
    }

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      if (RETRY_STATUSES.has(response.status) && attempt < DEFAULT_MAX_RETRIES) {
        await response.body?.cancel();
        const delayMs = getRetryDelayMs(
          response,
          DEFAULT_RETRY_DELAY_MS,
          attempt
        );
        await sleep(delayMs);
        attempt += 1;
        continue;
      }

      return response;
    } catch (error) {
      if (attempt < DEFAULT_MAX_RETRIES && isRetryableError(error)) {
        const delayMs = Math.min(
          DEFAULT_RETRY_DELAY_MS * Math.pow(2, attempt),
          MAX_RETRY_DELAY_MS
        );
        await sleep(delayMs);
        attempt += 1;
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (callerSignal && abortListener) {
        callerSignal.removeEventListener("abort", abortListener);
      }
    }
  }
}
