import type { Metadata, Viewport } from "next";
import {
  SHARE_TITLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  siteUrl,
  THEME_COLOR,
} from "@/lib/seo/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { fraunces, geist } from "./fonts";
import "./globals.css";

/**
 * Metadata raíz (D088). Cada página pone solo su título: el template agrega « · Melao».
 * La imagen al compartir, el ícono de Apple y el favicon salen de los archivos de `app/`
 * (`opengraph-image.png`, `twitter-image.png`, `apple-icon.png`, `favicon.ico`, `icon.svg`),
 * que genera `bun run brand:assets` (D087). Descripción provisional: fila 28.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  appleWebApp: { title: SITE_NAME },
  openGraph: {
    type: "website",
    locale: "es_419",
    siteName: SITE_NAME,
    title: SHARE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

// Barra del navegador del color de fondo de cada tema (va en `viewport`, no en `metadata`).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script de tema agrega `.dark` a <html> antes de hidratar (D034).
    <html
      // biome-ignore lint/a11y/useValidLang: es-419 (español de Latinoamérica) es BCP 47 válido; Biome no conoce las regiones UN M.49.
      lang="es-419"
      className={`${fraunces.variable} ${geist.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: script de tema propio y estático, debe correr antes del primer pintado.
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
