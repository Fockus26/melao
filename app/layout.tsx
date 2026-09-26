import type { Metadata } from "next";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { fraunces, geist } from "./fonts";
import "./globals.css";

// Copy provisional: título y descripción del sitio (CONTENT_CHECKLIST fila 28).
export const metadata: Metadata = {
  title: "Melao",
  description:
    "Aprende salsa casino y merengue en casa, con un coach por voz que cuenta al ritmo de la canción.",
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
