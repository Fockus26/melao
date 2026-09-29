import { cn } from "@/lib/utils";
import type { Enums } from "@/supabase/functions/_shared/database.types";
import { INDICATOR_STROKE } from "./stroke";

export type StepStatusValue = Enums<"step_status">;

/** Etiquetas de `docs/spec/pantallas.md` (Pasos · catálogo); provisionales, fila 36. */
export const STEP_STATUS_LABELS: Record<StepStatusValue, string> = {
  unknown: "No lo sé",
  learning: "Aprendiendo",
  known: "Me lo sé",
};

/** Relleno del círculo: vacío, mitad izquierda o lleno (la forma cambia, no solo el color). */
const FILL: Record<StepStatusValue, string> = {
  unknown: "bg-transparent",
  learning: "bg-linear-to-r from-text from-50% to-transparent to-50%",
  known: "bg-text",
};

/**
 * StepStatus (handoff §2): círculo de 12 px con borde en `text`; vacío, medio o lleno. Siempre
 * con la etiqueta visible; el círculo es decorativo.
 */
export function StepStatus({
  status,
  label,
  className,
}: {
  status: StepStatusValue;
  /** Reemplaza la etiqueta por defecto del estado. */
  label?: string;
  className?: string;
}) {
  return (
    <span
      data-slot="step-status"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-2 type-small text-text",
        className,
      )}
    >
      <span
        aria-hidden="true"
        style={{ borderWidth: INDICATOR_STROKE }}
        className={cn(
          "size-3 shrink-0 rounded-pill border-solid border-text",
          FILL[status],
        )}
      />
      {label ?? STEP_STATUS_LABELS[status]}
    </span>
  );
}
