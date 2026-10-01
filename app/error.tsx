"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/status/error-screen";

/**
 * Límite de error de la raíz (D110): cualquier excepción bajo el layout raíz. Sin conexión
 * (`navigator.onLine === false`) muestra esa variante en vez del 500. `retry()` (Next 16.3)
 * vuelve a pedir y pintar el segmento. Los límites de error no exportan `metadata`: el título
 * lo pone `ErrorScreen` con `<title>` de React, armado como el template de la raíz (D088).
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorScreen digest={error.digest} onRetry={retry} documentTitle />;
}
