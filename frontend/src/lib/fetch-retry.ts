/**
 * fetch with a bounded retry for the failures that are usually momentary: HTTP 429 / 502 / 503 / 504 and
 * dropped connections. Real answers (404, 422, 401 …) and timeouts are returned/thrown at once — a timeout
 * has already waited the full time. Waits honour Retry-After but are capped, so a retry never makes a
 * serverless request run away.
 */
export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  fetchImpl?: typeof fetch;
};

const RETRYABLE = new Set([429, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(url: string | URL, init: RequestInit = {}, opts: RetryOptions = {}): Promise<Response> {
  const { retries = 1, baseDelayMs = 600, maxDelayMs = 2000, fetchImpl = fetch } = opts;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetchImpl(url, init);
      if (!RETRYABLE.has(res.status) || attempt >= retries) return res;
      const asked = Number(res.headers.get("retry-after"));
      await sleep(Math.min(maxDelayMs, Number.isFinite(asked) && asked > 0 ? asked * 1000 : baseDelayMs * 2 ** attempt));
    } catch (e) {
      const timedOut = (e as Error)?.name === "TimeoutError" || (e as Error)?.name === "AbortError";
      if (timedOut || attempt >= retries) throw e;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}
