import type { MetadataRoute } from "next";
import {
  PWA_ICONS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SPLASH_BACKGROUND,
  THEME_COLOR,
} from "@/lib/seo/site";

/**
 * `/manifest.webmanifest`: la app instalada abre en Inicio (`/app`), sin barra del navegador.
 * El manifest admite un solo `theme_color`: el claro; `<meta name="theme-color">` del layout
 * lo ajusta por tema en el navegador.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "es-419",
    start_url: "/app",
    display: "standalone",
    background_color: SPLASH_BACKGROUND,
    theme_color: THEME_COLOR.light,
    icons: PWA_ICONS.map((icon) => ({ ...icon, type: "image/png" })),
  };
}
