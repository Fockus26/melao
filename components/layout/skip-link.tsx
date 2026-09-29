/** `id` del único `<main>` de cada shell: destino del enlace "Saltar al contenido". */
export const MAIN_ID = "contenido";

/**
 * Primer elemento enfocable de cada shell (WCAG 2.4.1). Oculto hasta recibir foco; entonces
 * aparece arriba a la izquierda, por encima de la navegación.
 * Copy provisional (CONTENT_CHECKLIST fila 38).
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_ID}`}
      className="sr-only type-button focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-toast focus:inline-flex focus:min-h-12 focus:items-center focus:rounded-md focus:bg-primary focus:px-5 focus:text-on-primary"
    >
      Saltar al contenido
    </a>
  );
}
