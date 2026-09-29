import type { MetadataRoute } from "next";
import { INDEXED_ROUTES, siteUrl } from "@/lib/seo/site";

/** `/sitemap.xml` (D088): las rutas públicas con URL absoluta del origen. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return INDEXED_ROUTES.map((route) => ({
    url: route === "/" ? base : `${base}${route}`,
    priority: route === "/" ? 1 : 0.5,
  }));
}
