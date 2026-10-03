import { calibrationCopy as COPY } from "./copy";

/** Carriles verticales de los puntos (en % del alto) para que no se encimen. */
const LANES = [30, 50, 70] as const;

/**
 * Gráfico del resultado (handoff § Calibrar 3): 56 de alto, la línea del clic (fina), los toques
 * medidos (puntos gold-600) y la línea del promedio (2 px, text). Escala horizontal en ms que
 * siempre incluye el clic (0). Es una imagen con nombre que lo resume: lo visual no agrega
 * nada que el aria-label no diga.
 */
export function TapChart({
  measuredMs,
  meanMs,
}: {
  measuredMs: readonly number[];
  meanMs: number;
}) {
  const min = Math.min(...measuredMs);
  const max = Math.max(...measuredMs);
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  const pad = Math.max(20, (hi - lo) * 0.15);
  const x = (v: number) => ((v - lo + pad) / (hi - lo + 2 * pad)) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={COPY.chartLabel(Math.round(min), Math.round(max), meanMs)}
        className="relative h-14 overflow-hidden rounded-sm bg-surface-sunken"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-px -translate-x-1/2 bg-text-secondary"
          style={{ left: `${x(0)}%` }}
        />
        {measuredMs.map((v, i) => (
          <span
            // El orden de los toques no cambia: el índice es su identidad.
            // biome-ignore lint/suspicious/noArrayIndexKey: toques fijos de una medición.
            key={i}
            aria-hidden="true"
            className="absolute size-2.5 -translate-1/2 rounded-pill bg-gold-600"
            style={{ left: `${x(v)}%`, top: `${LANES[i % LANES.length]}%` }}
          />
        ))}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-text"
          style={{ left: `${x(meanMs)}%` }}
        />
      </div>
      <p aria-hidden="true" className="type-caption text-text-secondary">
        {COPY.chartLegend}
      </p>
    </div>
  );
}
