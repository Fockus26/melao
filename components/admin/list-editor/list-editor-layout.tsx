import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { GuardedLink } from "./leave-guard";

/**
 * Patrón lista + editor del admin (handoff §3 Admin, Pasos y Canciones): desde 1280 dos columnas,
 * la lista de 400 y el editor con el resto; debajo, una sola columna: con algo abierto se ve el
 * editor en lugar de la lista, con "Volver a la lista" arriba; sin nada abierto, la lista.
 *
 * API:
 * - `list`: la columna de la lista (`ListPane`, `ListRows`…).
 * - `editor`: el editor abierto o el vacío ("Elige un paso…"), siempre presente.
 * - `hasSelection`: hay algo abierto (decide qué se ve en una columna).
 * - `back`: `{ href, label }` del enlace a la lista en una columna (pasa por el aviso de cambios
 *   sin guardar).
 * - `listLabel`: nombre accesible de la columna de la lista.
 */
export function ListEditorLayout({
  list,
  editor,
  hasSelection,
  back,
  listLabel,
}: {
  list: ReactNode;
  editor: ReactNode;
  hasSelection: boolean;
  back: { href: string; label: string };
  listLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[--spacing(100)_minmax(0,1fr)]">
      <section
        aria-label={listLabel}
        className={cn(
          "min-w-0 flex-col gap-6",
          hasSelection ? "hidden xl:flex" : "flex",
        )}
      >
        {list}
      </section>
      <div
        className={cn(
          "min-w-0 flex-col gap-4",
          hasSelection ? "flex" : "hidden xl:flex",
        )}
      >
        <GuardedLink
          href={back.href}
          className="inline-flex min-h-12 items-center gap-1 self-start type-small font-medium text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text xl:hidden"
        >
          <ChevronLeft
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
            className="size-4.5"
          />
          {back.label}
        </GuardedLink>
        {editor}
      </div>
    </div>
  );
}
