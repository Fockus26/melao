/**
 * Estado activo de la navegación (BottomNav, SideNav, AdminNav). Puro: sin React ni Next, para
 * probarlo con `bun test` y portarlo tal cual a Android/iOS.
 *
 * Regla: gana el destino cuyo `href` es el prefijo más largo de la ruta actual, cortando por
 * segmentos. Así `/app` (Inicio) solo queda activo en `/app` exacto o en rutas que no tengan un
 * destino más específico, y `/app/steps/enchufla` marca Pasos.
 */

/** Quita la barra final (salvo en `/`), la query y el hash. */
export function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0] || "/";
  return clean.length > 1 && clean.endsWith("/") ? clean.slice(0, -1) : clean;
}

/** `true` si `href` es `path` o un prefijo suyo que termina en un límite de segmento. */
export function matchesPath(path: string, href: string): boolean {
  const p = normalizePath(path);
  const h = normalizePath(href);
  if (h === "/") return p === "/";
  return p === h || p.startsWith(`${h}/`);
}

/**
 * El `href` activo entre `hrefs` para la ruta `path`, o `null` si ninguno coincide (p. ej. un
 * destino que no está en la barra: la barra queda sin ítem activo en vez de marcar uno falso).
 */
export function activeHref(
  path: string | null | undefined,
  hrefs: readonly string[],
): string | null {
  if (!path) return null;
  let best: string | null = null;
  for (const href of hrefs) {
    if (!matchesPath(path, href)) continue;
    if (
      best === null ||
      normalizePath(href).length > normalizePath(best).length
    )
      best = href;
  }
  return best;
}
