import { Play } from "lucide-react";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { stageCopy } from "./copy";

/**
 * Antes de sonar (handoff §3 Estados), en el lugar de la cuenta y el siguiente:
 * - preparando: spinner 40 dorado + porcentaje (`progressbar`); sin giro con movimiento reducido.
 * - bloqueado: botón circular de 160 "Toca para empezar" (el toque desbloquea el audio).
 */
export function StageGate({
  status,
  progress = 0,
  onStart,
  className,
}: {
  status: "preparing" | "blocked";
  progress?: number;
  onStart: () => void;
  className?: string;
}) {
  const pct = Math.round(progress * 100);
  return (
    <div
      data-slot="stage-gate"
      className={cn("flex items-center justify-center", className)}
    >
      {status === "preparing" ? (
        <div
          role="progressbar"
          aria-label={stageCopy.preparing}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={`${pct} %`}
          className="flex flex-col items-center gap-3"
        >
          <span
            aria-hidden="true"
            className="size-10 animate-spinner rounded-pill border-2 border-stage-progress border-r-transparent motion-reduce:animate-none"
          />
          <p className="type-small tabular-nums text-stage-secondary">
            {stageCopy.preparing} · {pct} %
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="inline-flex size-40 flex-col items-center justify-center gap-2 rounded-pill bg-stage-button px-4 text-center type-button-lg text-stage-on-button transition-[background-color,scale] duration-hover ease-standard hover:bg-stage-button-hover active:scale-98 active:duration-press motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <Play
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
            className="size-8"
          />
          {stageCopy.tapToStart}
        </button>
      )}
    </div>
  );
}
