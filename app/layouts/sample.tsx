import Link from "next/link";
import type { NavItem } from "@/components/layout/nav-items";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { cn } from "@/lib/utils";

/**
 * Piezas compartidas de las muestras de `/layouts/*` (D060). Las shells reciben la ruta
 * activa por prop (`?active=`) porque las pantallas reales aún no existen.
 * Copy de ejemplo: placeholder realista (CONTENT_CHECKLIST fila 39).
 */

/** Reexportado para las muestras que ya lo importaban de aquí; vive en `lib/search-params`. */
export { firstParam } from "@/lib/search-params";

/** `?active=course` → el ítem cuyo último segmento es `course` (por defecto, el primero). */
export function pickItem(
  items: readonly NavItem[],
  slug: string | undefined,
): NavItem {
  return items.find((item) => item.href.split("/").pop() === slug) ?? items[0];
}

/** Enlaces para ver la shell con otro ítem activo y volver al índice, con el conmutador de tema. */
export function SampleControls({
  base,
  items,
  activeHref,
}: {
  base: string;
  items: readonly NavItem[];
  activeHref: string;
}) {
  return (
    <section
      aria-labelledby="muestra-controles"
      className="flex flex-col gap-4 rounded-md border border-divider bg-surface p-5"
    >
      <h2 id="muestra-controles" className="type-h4">
        Controles de la muestra
      </h2>
      <p className="type-small text-text-secondary">
        Elige qué destino se ve activo. En las pantallas reales lo decide la
        ruta.
      </p>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const slug = item.href.split("/").pop();
          const isActive = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link
                href={`${base}?active=${slug}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-12 items-center rounded-pill border px-4 type-small",
                  isActive
                    ? "border-primary bg-primary font-semibold text-on-primary"
                    : "border-border-input text-text hover:bg-hover",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <ThemeSwitch />
      <Link
        href="/layouts"
        className="inline-flex min-h-12 items-center self-start type-small text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text"
      >
        Volver a las muestras
      </Link>
    </section>
  );
}

/** Bloque de relleno con la forma de una card: deja ver la columna, el ritmo y el scroll. */
export function PlaceholderCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-md border border-divider bg-surface p-5">
      <h3 className="type-h4">{title}</h3>
      <p className="type-small text-text-secondary">{text}</p>
    </article>
  );
}
