import type { StageStep } from "@/lib/stage/view";
import { cn } from "@/lib/utils";
import { stageCopy } from "./copy";

/**
 * UpcomingList (handoff §3 punto 6): "DESPUÉS" + "A → B → C" en `secondary`. Lista ordenada
 * con las flechas decorativas; si no queda nada, reserva el alto (nada salta).
 */
export function UpcomingList({
  steps,
  className,
}: {
  steps: readonly StageStep[];
  className?: string;
}) {
  return (
    <div
      data-slot="stage-upcoming"
      className={cn(
        "flex flex-col gap-1",
        steps.length === 0 && "invisible",
        className,
      )}
    >
      <p
        id="stage-upcoming-label"
        className="type-stage-label text-stage-label"
      >
        {stageCopy.later}
      </p>
      <ol
        aria-labelledby="stage-upcoming-label"
        className="flex flex-wrap gap-x-2 type-body text-stage-secondary"
      >
        {steps.map((s, i) => (
          <li key={`${s.stepId}-${i}`} className="flex gap-2">
            {i > 0 && <span aria-hidden="true">→</span>}
            {s.name}
          </li>
        ))}
      </ol>
    </div>
  );
}
