/**
 * Strict decimal parser for user-typed numbers. Unlike parseFloat it
 *  - accepts a decimal comma ("0,3" → 0.3) as typed in many locales,
 *  - rejects trailing junk ("0.16abc" → null, parseFloat would give 0.16),
 *  - rejects thousands-style ambiguity ("1,234.5", "1.234,5") instead of guessing.
 * Returns null for anything that is not a plain number; the caller decides what blank means.
 */
export function parseDecimal(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const commas = (s.match(/,/g) ?? []).length;
  if (commas > 1 || (commas === 1 && s.includes("."))) return null;
  const normal = s.replace(",", ".");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(normal)) return null;
  const v = Number(normal);
  return Number.isFinite(v) ? v : null;
}
