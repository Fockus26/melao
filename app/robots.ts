import type { MetadataRoute } from "next";
import { DISALLOWED_PATHS, siteUrl } from "@/lib/seo/site";

/** `/robots.txt` (D088): se rastrea lo público; lo privado y las muestras, no. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...DISALLOWED_PATHS] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
