"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { AudioStageSource } from "@/lib/player/player";
import {
  createSessionCompletion,
  type MarkCompleted,
} from "@/lib/stage/completion";

/**
 * Lo común de un escenario que suena (práctica libre y Lección, D145): crea la fuente una vez,
 * al montar prepara la pista y queda en "Toca para empezar" (la compuerta la pinta `Stage`,
 * D122); mientras está montado, la pestaña oculta pausa; al desmontar corta el audio y cierra el
 * contexto (uno solo vivo a la vez). Con `sessionId` y `mark`, pone la marca de fin (D146):
 * al acabar la canción solo, y con `finish()` (Terminar / Continuar) si llegó a sonar.
 */
export function useAudioStage(
  create: () => AudioStageSource,
  completion: { sessionId: string; mark: MarkCompleted | null },
) {
  const [source] = useState(create);
  const [tracker] = useState(() =>
    createSessionCompletion(completion.sessionId, completion.mark),
  );
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

  // Cada cambio del motor, no cada render: un "sonando" breve también cuenta.
  useEffect(
    () =>
      source.subscribe(() => tracker.observe(source.getSnapshot().status.kind)),
    [source, tracker],
  );

  return { source, status, finish: tracker.finish };
}
