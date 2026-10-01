"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  type AudioStageSource,
  createAudioStageSource,
} from "@/lib/player/player";
import { createSyntheticTrack } from "@/lib/player/synthetic-track";
import {
  type PracticeSessionData,
  practiceStage,
} from "@/lib/stage/practice-session";
import { cn } from "@/lib/utils";
import { stageCopy } from "./copy";
import { Stage } from "./stage";
import { stageButtonBase } from "./stage-controls";

/** Reproductor real (D030) con la pista sintética (D121) para una sesión guardada. */
function createSessionPlayer(data: PracticeSessionData): AudioStageSource {
  const { session, startMs } = practiceStage(data);
  return createAudioStageSource({
    session,
    startMs,
    bpm: data.bpm,
    track: createSyntheticTrack({
      anchors: session.timeline.anchors,
      beatsPerPhrase: data.style.beatsPerPhrase,
      durationMs: session.timeline.durationMs,
    }),
    latencyOffsetMs: data.latencyOffsetMs,
  });
}

/**
 * Sesión de práctica libre en el escenario (handoff § Sesión): suena de verdad, con el reloj de
 * Web Audio. Al montar prepara la pista y queda en "Toca para empezar"; al desmontar corta el
 * audio y cierra el contexto. Salir (X, confirmado) → `exitHref`; Terminar → `resultHref`
 * (D123): con borde mientras suena, para no acabar la sesión de un toque sin querer, y blanco
 * cuando termina la canción.
 */
export function PracticeSession({
  data,
  exitHref,
  resultHref,
}: {
  data: PracticeSessionData;
  exitHref: string;
  resultHref: string;
}) {
  const router = useRouter();
  const [source] = useState(() => createSessionPlayer(data));
  const status = useSyncExternalStore(
    source.subscribe,
    () => source.getSnapshot().status.kind,
    () => source.getSnapshot().status.kind,
  );

  useEffect(() => {
    const detach = source.attach();
    void source.prepare();
    return detach;
  }, [source]);

  const ended = status === "ended";
  return (
    <Stage
      source={source}
      styleLabel={data.styleName}
      bpm={Math.round(data.bpm)}
      onExit={() => router.push(exitHref)}
      footer={
        <button
          type="button"
          data-slot="stage-finish"
          onClick={() => router.push(resultHref)}
          className={cn(
            stageButtonBase,
            "h-14 w-full rounded-md px-5 type-button-lg",
            ended
              ? "bg-stage-button text-stage-on-button hover:bg-stage-button-hover"
              : "border border-stage-control-border text-stage-current hover:bg-stage-panel",
          )}
        >
          {stageCopy.finish}
        </button>
      }
    />
  );
}
