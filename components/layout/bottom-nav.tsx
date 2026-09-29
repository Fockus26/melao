"use client";

import Link from "next/link";
import { ICON_STROKE } from "@/components/ui/icon";
import { activeHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { APP_NAV } from "./nav-items";
import { useCurrentPath } from "./use-current-path";

const HREFS = APP_NAV.map((item) => item.href);

/**
 * Barra inferior (handoff §2 BottomNav), visible < 1024. Alto 80 + la zona segura del
 * dispositivo; el contenido de AppShell reserva ese mismo espacio abajo.
 * Activo: texto 600 + filete gold-600 de 24 × 2 arriba + `aria-current` (no solo color).
 */
export function BottomNav({ currentPath }: { currentPath?: string }) {
  const active = activeHref(useCurrentPath(currentPath), HREFS);

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-nav border-t border-divider bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid h-20 grid-cols-5">
        {APP_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = href === active;
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-w-12 flex-1 flex-col items-center justify-center gap-1 text-caption transition-colors duration-hover ease-standard motion-reduce:transition-none",
                  "focus-visible:-outline-offset-2",
                  isActive
                    ? "font-semibold text-text before:absolute before:top-0 before:left-1/2 before:h-0.5 before:w-6 before:-translate-x-1/2 before:bg-gold-600"
                    : "text-text-muted hover:text-text",
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
  );
}
