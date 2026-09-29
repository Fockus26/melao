import { Check, Lock, Repeat } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { INDICATOR_STROKE } from "./stroke";

export type PathNodeState =
  | "completed"
  | "current"
  | "available"
  | "locked"
  | "review";

/** Estado en texto de la segunda línea (provisional, CONTENT_CHECKLIST fila 36). */
export const PATH_NODE_STATE_LABELS: Record<PathNodeState, string> = {
  completed: "Completada",
  current: "Actual",
  available: "Disponible",
  locked: "Bloqueada",
  review: "Repaso",
};

/** Acción de la fila actual (provisional, fila 36). */
export const pathNodeActionLabel = "Continuar";

/** Segunda línea: "Lección 3 · Actual". */
export const pathNodeStatusLine = (label: string, stateLabel: string) =>
  `${label} · ${stateLabel}`;

/** Solo la bloqueada no es una acción (no enfocable, sin enlace). */
export const isPathNodeInteractive = (state: PathNodeState) =>
  state !== "locked";

/** El marcador de 48 × 48: forma e ícono cambian con el estado, no solo el color. */
function Marker({ state, number }: { state: PathNodeState; number: number }) {
  const thin = { borderWidth: INDICATOR_STROKE };
  switch (state) {
    case "completed":
      return (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-text text-bg">
          <Check strokeWidth={ICON_STROKE} className="size-6" />
        </span>
      );
    case "current":
      return (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-pill border-2 border-gold-600 bg-bg type-h3 tabular-nums text-text">
          {number}
        </span>
      );
    case "available":
      return (
        <span
          style={thin}
          className="flex size-12 shrink-0 items-center justify-center rounded-pill border-solid border-border-input type-h3 tabular-nums text-text"
        >
          {number}
        </span>
      );
    case "locked":
      return (
        <span
          style={thin}
          className="flex size-12 shrink-0 items-center justify-center rounded-pill border-dashed border-border-input text-text-muted"
        >
          <Lock strokeWidth={ICON_STROKE} className="size-4.5" />
        </span>
      );
    case "review":
      return (
        <span
          style={thin}
          className="flex size-12 shrink-0 items-center justify-center rounded-md border-solid border-gold-600 text-text"
        >
          <Repeat strokeWidth={ICON_STROKE} className="size-6" />
        </span>
      );
  }
}

/**
 * PathNode (handoff §2): una fila del camino del curso. Va dentro de un `<li>` de la lista del
 * camino. Marcador 48 × 48 + título + estado en texto ("Lección 3 · Actual").
 * - Actual: fila con bg gold-tint y un enlace "Continuar" (el único enfocable de la fila).
 * - Completada, disponible y repaso: la fila entera es el enlace (48 de alto como mínimo).
 * - Bloqueada: texto en text-muted, sin enlace ni foco; el estado se lee en la segunda línea.
 */
export function PathNode({
  state,
  number,
  title,
  label,
  href,
  stateLabel,
  actionLabel = pathNodeActionLabel,
  className,
}: {
  state: PathNodeState;
  /** Número de la lección en el camino. */
  number: number;
  /** Nombre de la lección: "Enchufla". */
  title: string;
  /** Primera parte de la segunda línea: "Lección 3". */
  label: string;
  /** Destino; se ignora en la bloqueada. */
  href?: string;
  /** Reemplaza el estado en texto por defecto. */
  stateLabel?: string;
  /** Texto del botón de la fila actual. */
  actionLabel?: string;
  className?: string;
}) {
  const status = pathNodeStatusLine(
    label,
    stateLabel ?? PATH_NODE_STATE_LABELS[state],
  );
  const locked = state === "locked";
  const text = (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className={cn("type-h4", locked ? "text-text-muted" : "text-text")}>
        {title}
      </span>
      <span
        className={cn(
          "type-small",
          locked ? "text-text-muted" : "text-text-secondary",
        )}
      >
        {status}
      </span>
    </span>
  );
  const marker = (
    <span aria-hidden="true" className="contents">
      <Marker state={state} number={number} />
    </span>
  );
  const row = "flex min-h-12 items-center gap-4 rounded-md";

  if (state === "current") {
    return (
      <div
        data-slot="path-node"
        data-state={state}
        className={cn(row, "bg-gold-tint p-3", className)}
      >
        {marker}
        {text}
        {href ? (
          <Button asChild className="shrink-0">
            <Link href={href}>
              {actionLabel}
              <span className="sr-only">: {title}</span>
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  if (!locked && href) {
    return (
      <Link
        href={href}
        data-slot="path-node"
        data-state={state}
        className={cn(
          row,
          "px-3 py-2 transition-colors duration-hover ease-standard hover:bg-hover motion-reduce:transition-none",
          className,
        )}
      >
        {marker}
        {text}
      </Link>
    );
  }

  return (
    <div
      data-slot="path-node"
      data-state={state}
      className={cn(row, "px-3 py-2", className)}
    >
      {marker}
      {text}
    </div>
  );
}
