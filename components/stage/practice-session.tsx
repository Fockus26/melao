"use client";

import { useRouter } from "next/navigation";
import { createSyntheticStageSource } from "@/lib/player/synthetic-stage";
import { browserMarkCompleted } from "@/lib/stage/completion-client";
import {
  type PracticeSessionData,
  practiceStage,
} from "@/lib/stage/practice-session";
import { cn } from "@/lib/utils";
import { stageCopy } from "./copy";
import { Stage } from "./stage";
import { stageButtonBase } from "./stage-controls";
import { useAudioStage } from "./use-audio-stage";

/**
 * Sesión de práctica libre en el escenario (handoff § Sesión): suena de verdad, con el reloj de
 * Web Audio y la pista sintética (`useAudioStage`, D030, D121). Al montar prepara la pista y
 * queda en "Toca para empezar"; al desmontar corta el audio y cierra el contexto. Salir (X,
 * confirmado) → `exitHref`; Terminar → `resultHref` (D123): con borde mientras suena, para no
 * acabar la sesión de un toque sin querer, y blanco cuando termina la canción. Al acabar la
 * canción, o con Terminar tras haber sonado, marca `completed_at` (D146); la muestra no escribe.
 */
export function PracticeSession({
  data,
  exitHref,
  resultHref,
  saveCompletion = true,
}: {
  data: PracticeSessionData;
  exitHref: string;
  resultHref: string;
  /** `false` en la muestra: nada se escribe. */
  saveCompletion?: boolean;
}) {
  const router = useRouter();
  const { source, status, finish } = useAudioStage(
    () =>
      createSyntheticStageSource({
        stage: practiceStage(data),
        bpm: data.bpm,
        latencyOffsetMs: data.latencyOffsetMs,
      }),
    {
      sessionId: data.sessionId,
      mark: saveCompletion ? browserMarkCompleted : null,
    },
  );

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
          onClick={() => {
            finish();
            router.push(resultHref);
          }}
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
