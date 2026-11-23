/** Thin client for this site's Route Handlers under src/app/api (Materials Project, citations). */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Longest a lookup may take. The slowest routes (band structures) finish well inside this. */
const TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 400;

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (typeof body.detail === "string") message = body.detail;
    else if (Array.isArray(body.detail)) message = body.detail.map((d: { msg: string }) => d.msg).join("; ");
  } catch {
    if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504)
      message = "The server could not complete the request. Please try again in a moment.";
  }
  throw new ApiError(message, res.status);
}

/**
 * fetch that turns a browser-level failure into something a person can act on. The browser's own message
 * ("Failed to fetch") says nothing; the usual causes are a dropped connection or a server that is restarting,
 * so one quiet retry usually hides it, and when it does not the user is told what to check.
 */
async function send(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      const timedOut = (e as Error)?.name === "TimeoutError";
      if (timedOut) throw new ApiError("The request took too long. Please try again in a moment.", 0);
      if (attempt >= 1) throw new ApiError("Could not reach the server — check your internet connection and try again.", 0);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

export function apiGet<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const q = qs.toString();
  return send(`/api${path}${q ? `?${q}` : ""}`).then(handle<T>);
}
