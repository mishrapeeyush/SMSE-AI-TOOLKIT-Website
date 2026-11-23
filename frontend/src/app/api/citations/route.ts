import type { NextRequest } from "next/server";

import { resolveDoi } from "@/lib/server/citations";
import { HttpError } from "@/lib/server/materials";
import { CACHE, respond } from "@/lib/server/respond";

/** GET /api/citations?doi=… — cacheable by the CDN (a DOI's metadata hardly ever changes). */
export function GET(request: NextRequest) {
  const doi = request.nextUrl.searchParams.get("doi");
  return respond(() => {
    if (!doi) throw new HttpError(422, "Add the DOI to look up, e.g. /api/citations?doi=10.1063/1.4812323.");
    return resolveDoi(doi);
  }, CACHE.day);
}

/** POST {"doi": "…"} — kept for existing callers; not CDN-cacheable. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return respond(async () => {
    if (typeof body?.doi !== "string") throw new HttpError(422, 'Send JSON like {"doi": "10.1063/1.4812323"}.');
    return resolveDoi(body.doi);
  });
}
