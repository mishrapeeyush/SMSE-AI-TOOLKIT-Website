import type { MetadataRoute } from "next";

import { siteUrl } from "../lib/site.ts";
import { TOOLS } from "../lib/tools.ts";

/** Home plus every tool in the central list, so a new tool is discoverable the moment it is added. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [{ url: base, changeFrequency: "weekly", priority: 1 }, { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 }, ...TOOLS.map((t) => ({ url: `${base}${t.href}`, changeFrequency: "monthly" as const, priority: 0.8 }))];
}
