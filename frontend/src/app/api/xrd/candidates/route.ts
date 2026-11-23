import type { NextRequest } from "next/server";

import { xrdCandidates } from "@/lib/server/materials";
import { CACHE, respond } from "@/lib/server/respond";

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  return respond(() => xrdCandidates(q.get("elements"), q.get("limit")), CACHE.day);
}
