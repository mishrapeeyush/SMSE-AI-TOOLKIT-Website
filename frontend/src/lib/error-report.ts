/**
 * Browser error reports. Shared by the client (builds + sends) and POST /api/log (validates).
 * A report holds only the error text and where it happened: no cookies, no form values, no
 * file contents and no query string (the path is cut at "?" and "#").
 */

export type ReportKind = "error" | "rejection" | "boundary";
export type Report = { kind: ReportKind; message: string; stack?: string; digest?: string; path: string };

const KINDS: ReportKind[] = ["error", "rejection", "boundary"];
export const MAX_REPORT_BYTES = 4096;

/** Errors that say nothing about this site: browser extensions, cross-origin scripts, benign loops. */
const IGNORED = [
  /^Script error\.?$/,
  /ResizeObserver loop/,
  /wasm streaming compile failed/,
  /falling back to ArrayBuffer instantiation/,
  /^Load failed$/,
  /chrome-extension:|moz-extension:|safari-extension:/,
];

export function isIgnorable(message: string, stack = ""): boolean {
  return IGNORED.some((re) => re.test(message) || re.test(stack));
}

const clip = (s: unknown, n: number): string => String(s ?? "").slice(0, n);

/** Validate an untrusted report body. Returns null when it is not a usable report. */
export function clipReport(body: unknown): Report | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const message = clip(b.message, 300).trim();
  if (!message || !KINDS.includes(b.kind as ReportKind)) return null;
  const path = clip(b.path, 120).split(/[?#]/)[0];
  const stack = typeof b.stack === "string" && b.stack ? clip(b.stack, 1500) : undefined;
  const digest = typeof b.digest === "string" && b.digest ? clip(b.digest, 40) : undefined;
  return { kind: b.kind as ReportKind, message, stack, digest, path: path.startsWith("/") ? path : "/" };
}

/** Turn anything thrown into a report (unknown values become their string form). */
export function buildReport(kind: ReportKind, err: unknown, path: string): Report | null {
  const e = err as { message?: unknown; stack?: unknown; digest?: unknown } | null;
  const message = typeof err === "string" ? err : typeof e?.message === "string" ? e.message : clip(err, 300);
  const stack = typeof e?.stack === "string" ? e.stack : undefined;
  if (!message || isIgnorable(message, stack)) return null;
  return clipReport({ kind, message, stack, digest: typeof e?.digest === "string" ? e.digest : undefined, path });
}
