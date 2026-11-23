/**
 * Extract a clean DOI from whatever a user pastes: a bare DOI, "doi:10.…", a doi.org URL
 * (possibly percent-encoded, possibly with tracking parameters), or a DOI inside brackets or a sentence.
 * Returns null when no DOI is present. Pure function — unit-tested in tests/doi.test.ts.
 */
const DOI = /10\.\d{4,9}\/[^\s"<>]+/i;

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // malformed % escape: use the text as typed
  }
}

export function parseDoi(raw: string): string | null {
  let text = raw.trim();
  if (/^https?:\/\//i.test(text)) {
    try {
      // A URL's query string and fragment are never part of the DOI.
      const u = new URL(text);
      text = decode(u.pathname);
    } catch {
      /* not a parseable URL: fall through to plain-text matching */
    }
  } else {
    text = decode(text);
  }
  const m = DOI.exec(text);
  if (!m) return null;
  let doi = m[0];
  // Trailing punctuation from the surrounding sentence is not part of the DOI.
  for (;;) {
    const last = doi[doi.length - 1];
    const unbalancedParen = last === ")" && (doi.match(/\)/g)?.length ?? 0) > (doi.match(/\(/g)?.length ?? 0);
    if (/[.,;:'\]}]/.test(last) || unbalancedParen) doi = doi.slice(0, -1);
    else break;
  }
  return doi;
}
