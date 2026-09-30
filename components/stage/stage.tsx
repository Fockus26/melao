"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { BeatRow } from "@/components/indicators/beat-row";
import { FullscreenShell } from "@/components/layout/fullscreen-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { StageSource } from "@/lib/stage/source";
import { cn } from "@/lib/utils";
import { stageAnnouncement, stageCopy } from "./copy";
import { Count } from "./count";
import { CurrentStep } from "./current-step";
import { NextStep } from "./next-step";
import { ProgressBar } from "./progress-bar";
import { StageControls } from "./stage-controls";
import { StageGate } from "./stage-gate";
import { StageHeader } from "./stage-header";
import { StatusChips } from "./status-chips";
import { UpcomingList } from "./upcoming-list";

/**
 * Escenario completo (handoff §3 Sesión, layout Compás, D026): negro en ambos temas
 * (FullscreenShell `stage`, D062). Solo pinta la instantánea del `StageSource` y le manda
 * comandos; el ritmo lo lleva el motor (reloj de audio, D030), nunca un timer de la UI.
 *
 * Vertical: columna de 480 como máximo, controles al pie. Apaisado (`stage-landscape`, D068):
 * la fila Ahora sube a la cabecera, cuenta + siguiente + controles en una fila y sin "Después".
 * Lector de pantalla: una región `polite` con el paso o el estado; la cuenta y la tira no se
 * anuncian (D058, D068).
 */
export function Stage({
  source,
  styleLabel,
  bpm,
  onExit,
  defaultExitOpen = false,
  bar,
  exitCopy,
  footer,
  title = stageCopy.title,
  titleId,
}: {
  source: StageSource;
  /** "Salsa casino". */
  styleLabel: string;
  bpm: number;
  /** Tras confirmar la salida. */
  onExit: () => void;
  defaultExitOpen?: boolean;
  /**
   * Barra propia en lugar de StageHeader (la lección pone la suya en versión oscura). Recibe
   * con qué envolver su botón de salir para que abra la confirmación.
   */
  bar?: (
    exitButton: (button: React.ReactElement) => React.ReactNode,
  ) => React.ReactNode;
  /** Textos de la confirmación de salida (la lección dice "¿Salir de la lección?"). */
  exitCopy?: { title: string; text: string; stay: string; leave: string };
  /** Debajo de los controles (la lección: "Continuar"). */
  footer?: React.ReactNode;
  /** Título (solo lector de pantalla); con `titleId` puede recibir el foco. */
  title?: string;
  titleId?: string;
}) {
  const snapshot = useSyncExternalStore(
    source.subscribe,
    source.getSnapshot,
    source.getSnapshot,
  );
  const [exitOpen, setExitOpen] = useState(defaultExitOpen);
  // Si sonaba al abrir la confirmación, "Seguir bailando" la reanuda.
  const resumeOnClose = useRef(false);
  const { status, view, voice } = snapshot;
  const gated = status.kind === "preparing" || status.kind === "blocked";

  const onExitOpenChange = (open: boolean) => {
    if (open) {
      resumeOnClose.current = status.kind === "playing";
      source.pause();
    } else if (resumeOnClose.current) {
      resumeOnClose.current = false;
      source.play();
    }
    setExitOpen(open);
  };

  const wrapExit = (button: React.ReactElement) => (
    <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
  );
  const exit = exitCopy ?? {
    title: stageCopy.exitTitle,
    text: stageCopy.exitText,
    stay: stageCopy.exitStay,
    leave: stageCopy.exitLeave,
  };

  return (
    <AlertDialog open={exitOpen} onOpenChange={onExitOpenChange}>
      <FullscreenShell
        variant="stage"
        bar={
          bar ? (
            bar(wrapExit)
          ) : (
            <StageHeader
              styleLabel={styleLabel}
              bpm={bpm}
              view={view}
              exitButton={wrapExit}
            />
          )
        }
      >
        <h1
          id={titleId}
          tabIndex={titleId ? -1 : undefined}
          className="sr-only"
        >
          {title}
        </h1>
        <p aria-live="polite" className="sr-only">
          {stageAnnouncement(snapshot)}
        </p>
        <div
          data-slot="stage"
          className={cn(
            "mx-auto grid w-full max-w-120 flex-1 grid-cols-1",
            "grid-rows-[auto_auto_auto_auto_auto_minmax(0,1fr)_auto_auto]",
            "[grid-template-areas:'chips'_'now'_'center'_'beats'_'later'_'.'_'progress'_'controls']",
            "stage-landscape:max-w-none stage-landscape:grid-cols-[minmax(0,1fr)_auto] stage-landscape:gap-x-6",
            "stage-landscape:grid-rows-[auto_minmax(0,1fr)_auto_auto]",
            "stage-landscape:[grid-template-areas:'chips_chips'_'center_controls'_'beats_beats'_'progress_progress']",
          )}
        >
          <StatusChips
            className="mt-1 [grid-area:chips]"
            paused={status.kind === "paused"}
            voiceOff={!voice}
            screenMayTurnOff={snapshot.screenMayTurnOff}
          />
          <CurrentStep
            view={view}
            className="mt-3 [grid-area:now] stage-landscape:hidden"
          />
          {gated ? (
            <StageGate
              className="mt-4 min-h-44 [grid-area:center] stage-landscape:mt-0 stage-landscape:min-h-40"
              status={status.kind}
              progress={status.kind === "preparing" ? status.progress : 0}
              onStart={source.play}
            />
          ) : (
            <div
              data-slot="stage-center"
              className="mt-4 flex min-h-44 items-end gap-4 [grid-area:center] stage-landscape:mt-0 stage-landscape:min-h-0 stage-landscape:self-end"
            >
              <Count beat={view.beatInPhrase} silent={view.silent} />
              <NextStep view={view} className="stage-landscape:max-w-85" />
            </div>
          )}
          <BeatRow
            className="mt-7 [grid-area:beats] stage-landscape:mt-3"
            beatsPerPhrase={snapshot.beatsPerPhrase}
            silentBeats={snapshot.silentBeats}
            activeBeat={gated ? null : view.beatInPhrase}
          />
          <UpcomingList
            steps={view.later}
            className="mt-6 [grid-area:later] stage-landscape:hidden"
          />
          <ProgressBar
            className="mt-6 [grid-area:progress] stage-landscape:mt-3"
            positionMs={view.positionMs}
            durationMs={view.durationMs}
          />
          <StageControls
            className={cn(
              "mt-6 [grid-area:controls] stage-landscape:mt-0 stage-landscape:self-end",
              gated && "invisible",
            )}
            status={status.kind}
            voice={voice}
            onToggle={() =>
              status.kind === "playing" ? source.pause() : source.play()
            }
            onRestart={source.restart}
            onVoice={source.setVoice}
          />
        </div>
        {footer ? (
          <div className="mx-auto mt-6 w-full max-w-120 stage-landscape:max-w-none">
            {footer}
          </div>
        ) : null}
      </FullscreenShell>
      {/* Portal fuera del subárbol `dark` del escenario: se lo vuelve a poner (handoff §2). */}
      <AlertDialogContent className="dark border-divider bg-stage-panel">
        <AlertDialogTitle>{exit.title}</AlertDialogTitle>
        <AlertDialogDescription>{exit.text}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>{exit.stay}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              resumeOnClose.current = false;
              onExit();
            }}
          >
            {exit.leave}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
