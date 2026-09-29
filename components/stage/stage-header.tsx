import { X } from "lucide-react";
import { ICON_STROKE } from "@/components/ui/icon";
import type { StageView } from "@/lib/stage/view";
import { currentName, stageCopy } from "./copy";
import { phraseText } from "./current-step";

/**
 * StageHeader (handoff §3 punto 1): X de 48 (abre la confirmación) + "Salsa casino · 184 BPM".
 * Apaisado suma a la derecha "Ahora · Guapea · frase 2 de 2" (la fila Ahora se oculta).
 * `exitButton` lo envuelve el `AlertDialogTrigger` del Stage (el foco vuelve a la X al cerrar).
 */
export function StageHeader({
  styleLabel,
  bpm,
  view,
  exitButton,
}: {
  styleLabel: string;
  bpm: number;
  view: StageView;
  exitButton?: (button: React.ReactElement) => React.ReactNode;
}) {
  const phrase = phraseText(view);
  const button = (
    <button
      type="button"
      aria-label={stageCopy.exit}
      className="inline-flex size-12 shrink-0 items-center justify-center rounded-pill border border-stage-control-border text-stage-current transition-colors duration-hover ease-standard hover:bg-stage-panel motion-reduce:transition-none"
    >
      <X aria-hidden="true" strokeWidth={ICON_STROKE} className="size-6" />
    </button>
  );
  return (
    <>
      {exitButton ? exitButton(button) : button}
      <p className="min-w-0 truncate type-small text-stage-secondary">
        {styleLabel} · <span className="tabular-nums">{bpm} BPM</span>
      </p>
      <p className="ml-auto hidden min-w-0 truncate type-small text-stage-secondary stage-landscape:block">
        <span className="type-stage-label text-stage-label">
          {stageCopy.now}
        </span>
        {" · "}
        <span className="text-stage-current">{currentName(view)}</span>
        {phrase && <span className="tabular-nums"> · {phrase}</span>}
      </p>
    </>
  );
}
