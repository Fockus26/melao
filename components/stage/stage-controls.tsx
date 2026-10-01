import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { ICON_STROKE } from "@/components/ui/icon";
import type { StageStatus } from "@/lib/stage/source";
import { cn } from "@/lib/utils";
import { stageCopy } from "./copy";

/**
 * Botones propios del escenario (no el Button de la app, handoff §2): tema fijo sobre negro.
 * Hover inmediato con movimiento reducido; presionado `scale(.98)`.
 */
export const stageButtonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 transition-[background-color,scale] duration-hover ease-standard active:scale-98 active:duration-press motion-reduce:transition-none motion-reduce:active:scale-100";

/** Botón cuadrado de 56 con borde (reiniciar, voz). */
export const stageSquareButton = cn(
  stageButtonBase,
  "size-14 rounded-md border border-stage-control-border text-stage-current hover:bg-stage-panel",
);

/**
 * StageControls (handoff §3 punto 8): Reiniciar 56 · Pausa blanco a lo ancho · Voz 56 como
 * toggle `aria-pressed`. Apaisado: los tres de 56 × 56, el texto de pausa queda para el lector.
 */
export function StageControls({
  status,
  voice,
  onToggle,
  onRestart,
  onVoice,
  className,
}: {
  status: StageStatus["kind"];
  voice: boolean;
  onToggle: () => void;
  onRestart: () => void;
  onVoice: (on: boolean) => void;
  className?: string;
}) {
  const playing = status === "playing";
  const label = playing
    ? stageCopy.pause
    : status === "ended"
      ? stageCopy.again
      : stageCopy.resume;
  const MainIcon = playing ? Pause : Play;
  const VoiceIcon = voice ? Volume2 : VolumeX;
  return (
    <div
      data-slot="stage-controls"
      className={cn("flex items-center gap-3", className)}
    >
      <button
        type="button"
        onClick={onRestart}
        aria-label={stageCopy.restart}
        className={stageSquareButton}
      >
        <RotateCcw
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="size-6"
        />
      </button>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          stageButtonBase,
          "h-14 min-w-0 flex-1 rounded-md bg-stage-button px-5 type-button-lg text-stage-on-button hover:bg-stage-button-hover",
          "stage-landscape:w-14 stage-landscape:flex-none stage-landscape:px-0",
        )}
      >
        <MainIcon
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="size-6"
        />
        <span className="stage-landscape:sr-only">{label}</span>
      </button>
      <button
        type="button"
        aria-pressed={voice}
        aria-label={stageCopy.voice}
        onClick={() => onVoice(!voice)}
        className={cn(stageSquareButton, !voice && "bg-stage-panel")}
      >
        <VoiceIcon
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="size-6"
        />
      </button>
    </div>
  );
}
