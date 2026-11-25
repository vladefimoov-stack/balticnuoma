import type { MetadataRoute } from "next";
import { site } from "@/lib/config/site";

/**
 * /robots.txt. Only the production deployment is indexable — Vercel preview deployments
 * (VERCEL_ENV = "preview") tell every crawler to stay away.
 * OG cards live under /api/og/ and must stay reachable for link previews (Facebook, X, Slack…).
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: ["/", "/api/og/"], disallow: ["/admin", "/api/"] },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
