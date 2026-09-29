import { formatClock } from "@/lib/stage/view";
import { cn } from "@/lib/utils";
import { stageCopy } from "./copy";

/**
 * ProgressBar (handoff §3 punto 7): riel de 4 px `track` con el avance en `progress` y los
 * tiempos 1:42 / 4:05 debajo; apaisado, los tiempos a los lados en la misma fila. El avance
 * se anima lineal y salta con movimiento reducido. `progressbar` con el texto "1:42 de 4:05".
 */
export function ProgressBar({
  positionMs,
  durationMs,
  className,
}: {
  positionMs: number;
  durationMs: number;
  className?: string;
}) {
  const ratio = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
  const pos = formatClock(positionMs);
  const total = formatClock(durationMs);
  return (
    <div
      data-slot="stage-progress"
      className={cn(
        "grid grid-cols-2 items-center gap-x-3 gap-y-2 type-small tabular-nums text-stage-secondary",
        "stage-landscape:grid-cols-[auto_minmax(0,1fr)_auto]",
        className,
      )}
    >
      <span aria-hidden="true">{pos}</span>
      <div
        role="progressbar"
        aria-label={stageCopy.progress}
        aria-valuemin={0}
        aria-valuemax={Math.floor(durationMs / 1000)}
        aria-valuenow={Math.floor(positionMs / 1000)}
        aria-valuetext={stageCopy.progressText(pos, total)}
        className="order-first col-span-2 h-1 overflow-hidden rounded-pill bg-stage-track stage-landscape:order-none stage-landscape:col-span-1"
      >
        <div
          className="h-full origin-left rounded-pill bg-stage-progress transition-transform duration-enter ease-linear motion-reduce:transition-none"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <span aria-hidden="true" className="justify-self-end">
        {total}
      </span>
    </div>
  );
}
