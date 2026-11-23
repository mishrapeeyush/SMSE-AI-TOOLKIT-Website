import "server-only";

import { HttpError } from "./materials";

/**
 * "use cache" functions cannot throw HttpError across their boundary (the class is lost), and transient
 * failures must not be cached. So permanent answers ("not found", "invalid") are returned as data — and
 * cached — while anything else (timeouts, upstream 5xx) is thrown and therefore never cached.
 */
export type Outcome<T> = { ok: T } | { error: { status: number; message: string } };

export async function capture<T>(fn: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: await fn() };
  } catch (e) {
    if (e instanceof HttpError && e.status < 500) return { error: { status: e.status, message: e.message } };
    // Transient: thrown (so never cached). The class does not survive the cache boundary, but the text does.
    if (e instanceof HttpError) throw new Error(`${TRANSIENT}${e.status}:${e.message}`);
    throw e;
  }
}

const TRANSIENT = "transient-http:";

/** Restore the HttpError that `capture` flattened into an Error message while crossing a cache boundary. */
export function restoreHttpError(e: unknown, fallback: string): HttpError {
  if (e instanceof HttpError) return e;
  const m = e instanceof Error && e.message.startsWith(TRANSIENT) ? /^transient-http:(\d+):([\s\S]*)$/.exec(e.message) : null;
  return m ? new HttpError(Number(m[1]), m[2]) : new HttpError(502, fallback);
}

export function unwrap<T>(o: Outcome<T>): T {
  if ("error" in o) throw new HttpError(o.error.status, o.error.message);
  return o.ok;
}
