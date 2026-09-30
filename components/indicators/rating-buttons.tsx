"use client";

import { Check } from "lucide-react";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { SrsRating } from "@/supabase/functions/_shared/core/srs";
import { RATING_LABELS, RATINGS } from "./rating-labels";

export { RATING_LABELS, RATINGS };

/**
 * RatingButtons (handoff §2): la calificación de un paso en el repaso. `<fieldset>` +
 * `<legend>` = nombre del paso; cada opción es un radio nativo del mismo `name`: el navegador ya
 * da el grupo de una sola elección, las flechas y "1 de 4" sin ARIA a mano (D057). Grilla 2 × 2 por debajo de 768 y
 * 4 columnas desde 768. Sin rojo ni verde: el significado lo da el texto; el seleccionado se
 * invierte (bg primary) y lleva un check, así no depende solo del color.
 * No calcula FSRS: los intervalos ("< 1 día", "3 días"…) llegan del backend por props.
 */
export function RatingButtons({
  name,
  legend,
  intervals,
  value,
  defaultValue,
  onValueChange,
  labels = RATING_LABELS,
  disabled,
  className,
}: {
  /** `name` de los radios: uno por paso (varios grupos en la misma pantalla). */
  name: string;
  /** Nombre del paso: "Enchufla". */
  legend: string;
  /** Intervalo que resulta de cada calificación. */
  intervals: Record<SrsRating, string>;
  /** Controlado: la calificación elegida o `null`. */
  value?: SrsRating | null;
  /** No controlado: calificación inicial. */
  defaultValue?: SrsRating;
  onValueChange?: (rating: SrsRating) => void;
  labels?: Record<SrsRating, string>;
  disabled?: boolean;
  className?: string;
}) {
  const controlled = value !== undefined;
  return (
    <fieldset
      data-slot="rating-buttons"
      disabled={disabled}
      className={cn("min-w-0", className)}
    >
      <legend className="mb-3 type-h4 text-text">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {RATINGS.map((rating) => (
          <label
            key={rating}
            className={cn(
              "relative flex min-h-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border border-border-input px-1.5 py-2 text-center text-text",
              "transition-[background-color,border-color,color] duration-hover ease-standard motion-reduce:transition-none",
              "hover:bg-hover has-checked:border-primary has-checked:bg-primary has-checked:text-on-primary",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring",
              "has-disabled:cursor-not-allowed has-disabled:border-divider has-disabled:bg-surface-sunken has-disabled:text-text-muted",
            )}
          >
            <input
              type="radio"
              name={name}
              value={rating}
              {...(controlled
                ? { checked: value === rating }
                : { defaultChecked: defaultValue === rating })}
              onChange={() => onValueChange?.(rating)}
              className="peer sr-only"
            />
            <Check
              aria-hidden="true"
              strokeWidth={ICON_STROKE}
              className="absolute top-1.5 right-1.5 hidden size-4 peer-checked:block"
            />
            <span className="type-h5">{labels[rating]}</span>
            <span className="type-caption text-text-secondary peer-checked:text-on-primary peer-disabled:text-text-muted">
              {intervals[rating]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
