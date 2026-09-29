import { cn } from "@/lib/utils";

/** Niveles de dificultad de pasos y canciones (`check (difficulty between 1 and 5)`). */
export const DIFFICULTY_LEVELS = 5;

/** Alto de cada barra (6/8/10/12/14 px): escala de espaciado de 4 px. */
const BAR_HEIGHTS = ["h-1.5", "h-2", "h-2.5", "h-3", "h-3.5"] as const;

/** Barras llenas para un nivel: entero entre 0 y 5 (lo que llegue fuera de rango se acota). */
export function filledBars(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.min(DIFFICULTY_LEVELS, Math.max(0, Math.round(level)));
}

/** Texto por defecto (provisional, CONTENT_CHECKLIST fila 36). */
export const difficultyLabel = (level: number) =>
  `Dificultad ${filledBars(level)}`;

/**
 * Difficulty (handoff §2): 5 barras de 4 px de ancho y alto creciente, llenas gold-600 y vacías
 * divider, **siempre** con texto. Las barras son decorativas (`aria-hidden`): el valor lo da el
 * texto, por eso su contraste no-texto no es obligatorio (D056).
 */
export function Difficulty({
  level,
  label,
  className,
}: {
  /** 1–5. */
  level: number;
  /** Texto visible junto a las barras: "Dificultad 3", "Media"… */
  label?: string;
  className?: string;
}) {
  const filled = filledBars(level);
  return (
    <span
      data-slot="difficulty"
      className={cn(
        "inline-flex items-center gap-2 type-small text-text-secondary",
        className,
      )}
    >
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {BAR_HEIGHTS.map((height, i) => (
          <span
            key={height}
            data-filled={i < filled}
            className={cn(
              "w-1",
              height,
              i < filled ? "bg-gold-600" : "bg-divider",
            )}
          />
        ))}
      </span>
      {label ?? difficultyLabel(level)}
    </span>
  );
}
