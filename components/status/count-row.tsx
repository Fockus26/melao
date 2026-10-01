import { cn } from "@/lib/utils";

/**
 * La cuenta `1 2 3 4 5 6 7 ·` de las pantallas de estado (D109). Decorativa: `aria-hidden`, el
 * mensaje lo dan el eyebrow y el título.
 * - `steady` (404): el 4 grande en Fraunces cursiva (`text`; gold-600 en oscuro, gráfico dorado
 *   informativo). En `split`, desde 1024 px crece al tamaño de la cuenta del escenario (160).
 * - `offbeat` (500): "desacompasada", sin el 4, con números desplazados y girados y el punto
 *   en `error`.
 */
type CountRowProps = {
  variant: "steady" | "offbeat";
  /** Pantalla a dos columnas desde 1024 px (solo el 404 de escritorio). */
  split?: boolean;
};

const NUMBER = "text-h3 font-medium";

export function CountRow({ variant, split = false }: CountRowProps) {
  if (variant === "offbeat")
    return (
      <div
        aria-hidden="true"
        data-count="offbeat"
        className={cn(
          "flex h-16 items-center gap-3 text-text-muted tabular-nums",
          NUMBER,
        )}
      >
        <span>1</span>
        <span>2</span>
        <span className="-translate-y-2.5">3</span>
        <span className="translate-y-2">5</span>
        <span className="-rotate-12">6</span>
        <span>7</span>
        <span className="text-error">·</span>
      </div>
    );

  return (
    <div
      aria-hidden="true"
      data-count="steady"
      className={cn(
        "flex items-baseline gap-3 text-text-muted tabular-nums",
        NUMBER,
        split &&
          "lg:justify-center lg:gap-5 lg:border-divider lg:border-y lg:py-14 lg:text-numeric-lg",
      )}
    >
      <span>1</span>
      <span>2</span>
      <span>3</span>
      <span
        className={cn(
          "font-normal font-serif text-display-xl text-text italic leading-none dark:text-gold-600",
          // `text-stage-count` a secas es el color del escenario: se pide el tamaño (160) explícito.
          split && "lg:text-(length:--text-stage-count)",
        )}
      >
        4
      </span>
      <span>5</span>
      <span>6</span>
      <span>7</span>
      <span>·</span>
    </div>
  );
}
