import { cn } from "@/lib/utils";

/** Etapas completadas acotadas a [0, total]; total mínimo 1. */
export function lessonProgress(completed: number, total: number) {
  const max = Math.max(1, Math.floor(total));
  const done = Math.min(max, Math.max(0, Math.floor(completed)));
  return { done, max };
}

/** Texto por defecto (provisional, CONTENT_CHECKLIST fila 36). */
export const lessonProgressLabel = "Progreso de la lección";
export const lessonProgressValueText = (done: number, max: number) =>
  `${done} de ${max} etapas`;

/**
 * LessonProgress (handoff §2): un segmento de 3 px por etapa (gap 4), completados gold-600 y
 * pendientes divider, más "2 / 6" en texto. `role="progressbar"` con el valor en texto
 * (`aria-valuetext`); el contraste de los segmentos no es obligatorio porque el texto lo dice (D056).
 */
export function LessonProgress({
  completed,
  total,
  label = lessonProgressLabel,
  valueText,
  className,
}: {
  completed: number;
  /** Etapas de la lección (el handoff muestra 6). */
  total: number;
  /** Nombre accesible de la barra. */
  label?: string;
  /** Lectura del valor; por defecto "2 de 6 etapas". */
  valueText?: string;
  className?: string;
}) {
  const { done, max } = lessonProgress(completed, total);
  return (
    <div
      data-slot="lesson-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={done}
      aria-valuetext={valueText ?? lessonProgressValueText(done, max)}
      className={cn("flex items-center gap-3", className)}
    >
      <div aria-hidden="true" className="flex flex-1 gap-1">
        {Array.from({ length: max }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: los segmentos son posiciones fijas.
            key={i}
            data-done={i < done}
            className={cn(
              "h-0.75 flex-1 transition-colors duration-state ease-standard motion-reduce:transition-none",
              i < done ? "bg-gold-600" : "bg-divider",
            )}
          />
        ))}
      </div>
      <span
        aria-hidden="true"
        className="type-small tabular-nums text-text-secondary"
      >
        {done} / {max}
      </span>
    </div>
  );
}
