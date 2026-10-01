"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/status/error-screen";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { fraunces, geist } from "./fonts";
import "./globals.css";

/**
 * Error en el propio layout raíz (D110): reemplaza el documento entero, así que trae su
 * `<html>`, sus estilos, sus fuentes y el script de tema (la doc de Next 16: no hereda nada del
 * layout). Mismo contenido que `app/error.tsx`.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
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
      <body>
        <ErrorScreen digest={error.digest} onRetry={retry} documentTitle />
      </body>
    </html>
  );
}
