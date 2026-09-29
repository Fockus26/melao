"use client";

import Link from "next/link";
import { ICON_STROKE } from "@/components/ui/icon";
import { activeHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { SIDE_NAV } from "./nav-items";
import { useCurrentPath } from "./use-current-path";

const HREFS = SIDE_NAV.map((item) => item.href);

/** Plan que muestra la card del pie. Sin datos reales todavía: lo pasa quien monta la shell. */
export type SidePlan = { name: string; status: string };

/**
 * Navegación lateral ≥ 1024 (handoff §2 SideNav): 248 de ancho, logo arriba, 6 ítems de 48
 * (los 5 de la barra + Progreso, D028) y la card "Tu plan" abajo.
 * Activo: fondo gold-tint + texto 600 + `aria-current`.
 */
export function SideNav({
  currentPath,
  plan,
}: {
  currentPath?: string;
  plan?: SidePlan;
}) {
  const active = activeHref(useCurrentPath(currentPath), HREFS);

  return (
    <div className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-8 overflow-y-auto border-r border-divider bg-surface px-4 py-6 lg:flex">
      <Link
        href="/app"
        className="inline-flex min-h-12 items-center self-start rounded-md px-3"
      >
        <Logo />
      </Link>
      <nav aria-label="Principal">
        <ul className="flex flex-col gap-1">
          {SIDE_NAV.map(({ href, label, icon: Icon }) => {
            const isActive = href === active;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-md px-3 text-button transition-colors duration-hover ease-standard motion-reduce:transition-none",
                    isActive
                      ? "bg-gold-tint font-semibold text-text"
                      : "font-normal text-text hover:bg-hover",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    strokeWidth={ICON_STROKE}
                    className="size-6"
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {plan && (
        // Copy provisional: "Tu plan" (CONTENT_CHECKLIST fila 38).
        <section
          aria-label="Tu plan"
          className="mt-auto flex flex-col gap-1 rounded-md border border-divider bg-bg p-4"
        >
          <p className="type-eyebrow text-text-secondary">Tu plan</p>
          <p className="type-small text-text">
            <span className="font-semibold">{plan.name}</span> · {plan.status}
          </p>
        </section>
      )}
    </div>
  );
}
