/**
 * Datos del sitio para la metadata raíz, `robots.txt`, `sitemap.xml` y el manifest (D088).
 * Puro: lo leen `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts` y los tests.
 */

import { colorValue } from "@/lib/tokens/model";

/** Producción, si falta `NEXT_PUBLIC_SITE_URL` (sin ella las URLs de OG saldrían relativas). */
export const PRODUCTION_URL = "https://melao-two.vercel.app";

/** Origen público sin barra final: `NEXT_PUBLIC_SITE_URL` o el de producción. */
export function siteUrl(
  env: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
) {
  return (env?.trim() || PRODUCTION_URL).replace(/\/+$/, "");
}

export const SITE_NAME = "Melao";

// Copy provisional: descripción del sitio (CONTENT_CHECKLIST fila 28).
export const SITE_DESCRIPTION =
  "Aprende salsa casino y merengue en casa, con un coach por voz que cuenta al ritmo de la canción.";

// Copy provisional: título de la tarjeta al compartir, del tablero de Open Graph (fila 49).
export const SHARE_TITLE = "Melao · Salsa y merengue con coach";

/** Color de la barra del navegador (tablero *Marca · Open Graph e íconos*): el `bg` de cada tema. */
export const THEME_COLOR = {
  light: colorValue("light", "bg"),
  dark: colorValue("dark", "bg"),
};

/** Fondo de arranque de la PWA: la baldosa del ícono. */
export const SPLASH_BACKGROUND = colorValue("light", "text");

/**
 * Rutas públicas que se indexan (fila 50). `/legal/*` las crea la unidad de legales.
 * Cuando haya catálogo público, sus rutas salen de los datos, no de esta lista.
 */
export const INDEXED_ROUTES = [
  "/",
  "/plans",
  "/login",
  "/register",
  "/legal/terms",
  "/legal/privacy",
] as const;

/**
 * Prefijos que no se rastrean: la app con sesión, el admin, auth, el onboarding, el pago, el
 * spike y las páginas de muestra del sistema de diseño (que además llevan `noindex`).
 * `/app` va como `/app$` + `/app/` para no bloquear `/apple-icon.png`, que empieza igual.
 */
export const DISALLOWED_PATHS = [
  "/app$",
  "/app/",
  "/admin",
  "/auth",
  "/welcome",
  "/checkout",
  "/spike",
  "/indicators",
  "/layouts",
  "/primitives",
  "/stage",
  "/tokens",
] as const;

/** Íconos de la PWA en `public/icons/` (los genera `bun run brand:assets`). */
export const PWA_ICONS = [
  { src: "/icons/icon-192.png", sizes: "192x192", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", purpose: "any" },
  {
    src: "/icons/icon-maskable-512.png",
    sizes: "512x512",
    purpose: "maskable",
  },
] as const;
