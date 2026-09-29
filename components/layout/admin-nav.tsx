"use client";

import Link from "next/link";
import { useState } from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import { activeHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ADMIN_NAV, ADMIN_STUDENT_VIEW, type NavItem } from "./nav-items";
import { useCurrentPath } from "./use-current-path";

const HREFS = ADMIN_NAV.map((item) => item.href);

/**
 * Ítem del AdminNav. ≥ 1280: ícono + etiqueta. < 1280 (riel de 72): solo ícono; el nombre va
 * en `aria-label` y se ve en una etiqueta flotante al enfocar con teclado o al pasar el
 * puntero, así que no depende de hover (D062). Activo en el riel: fondo + filete gold-600 a
 * la izquierda, para no depender solo del color.
 */
function AdminNavLink({
  item: { href, label, icon: Icon },
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  // Esc oculta la etiqueta flotante sin mover el foco ni el puntero (WCAG 1.4.13).
  const [tipDismissed, setTipDismissed] = useState(false);
  const showTip = () => setTipDismissed(false);

  return (
    <Link
      href={href}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === "Escape") setTipDismissed(true);
      }}
      onBlur={showTip}
      onMouseLeave={showTip}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex h-12 items-center justify-center gap-3 rounded-md text-button transition-colors duration-hover ease-standard motion-reduce:transition-none xl:justify-start xl:px-3",
        isActive
          ? "bg-gold-tint font-semibold text-text max-xl:before:absolute max-xl:before:top-1/2 max-xl:before:left-0 max-xl:before:h-6 max-xl:before:w-0.5 max-xl:before:-translate-y-1/2 max-xl:before:bg-gold-600"
          : "font-normal text-text hover:bg-hover",
      )}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={ICON_STROKE}
        className="size-6 shrink-0"
      />
      {/* Riel: la etiqueta flota a la derecha. El padding transparente une el ítem con la
          etiqueta para que el puntero pueda pasar a ella sin que desaparezca (WCAG 1.4.13). */}
      <span
        className={cn(
          "max-xl:absolute max-xl:top-1/2 max-xl:left-full max-xl:z-popover max-xl:hidden max-xl:-translate-y-1/2 max-xl:pl-3 max-xl:group-hover:block max-xl:group-focus-visible:block",
          tipDismissed && "max-xl:hidden!",
        )}
      >
        <span className="max-xl:block max-xl:whitespace-nowrap max-xl:rounded-sm max-xl:bg-primary max-xl:px-3 max-xl:py-2 max-xl:type-small max-xl:text-on-primary max-xl:shadow-drag">
          {label}
        </span>
      </span>
    </Link>
  );
}

/**
 * Navegación del admin (handoff §2 AdminNav): 232 con etiquetas ≥ 1280, riel de 72 debajo.
 * Va en el flujo (no fija) para que la etiqueta flotante del riel no quede recortada.
 */
export function AdminNav({ currentPath }: { currentPath?: string }) {
  const active = activeHref(useCurrentPath(currentPath), HREFS);

  return (
    <div className="flex w-18 shrink-0 flex-col gap-8 border-r border-divider bg-surface px-3 py-6 xl:w-58 xl:px-4">
      <Link
        href="/admin"
        className="inline-flex min-h-12 items-center justify-center rounded-md xl:justify-start xl:px-3"
      >
        <Logo wordmarkClassName="max-xl:sr-only" />
      </Link>
      <nav aria-label="Administración" className="flex flex-1 flex-col gap-1">
        <ul className="flex flex-col gap-1">
          {ADMIN_NAV.map((item) => (
            <li key={item.href}>
              <AdminNavLink item={item} isActive={item.href === active} />
            </li>
          ))}
        </ul>
        <ul className="mt-auto flex flex-col gap-1 border-t border-divider pt-4">
          <li>
            <AdminNavLink item={ADMIN_STUDENT_VIEW} isActive={false} />
          </li>
        </ul>
      </nav>
    </div>
  );
}
