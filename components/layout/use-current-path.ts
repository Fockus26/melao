"use client";

import { usePathname } from "next/navigation";

/**
 * Ruta para el estado activo de la navegación: la del router, salvo que la shell reciba
 * `currentPath` (páginas de muestra en `/layouts/*` y tests, D060).
 */
export function useCurrentPath(currentPath?: string): string | null {
  const pathname = usePathname();
  return currentPath ?? pathname;
}
