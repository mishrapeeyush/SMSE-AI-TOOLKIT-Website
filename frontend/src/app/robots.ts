import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // The API routes proxy a rate-limited upstream: keep crawlers off them.
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${siteUrl()}/sitemap.xml` };
}
