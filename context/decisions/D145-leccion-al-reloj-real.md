# D145 · Técnica · La mini práctica y la práctica final de la Lección usan la misma fuente de audio que la práctica libre (reloj de Web Audio + pista sintética + latencia guardada) · Implementado

**Decisión:** la Lección deja el motor falso. Su escenario sale de `createSyntheticStageSource`
(`lib/player/synthetic-stage.ts`): el reproductor real (D030) con la pista sintética (D121), la
cuenta como tonos y la calibración web guardada del alumno (D124; `LessonData.latencyOffsetMs`,
leída con `getWebLatencyMs`, la misma lectura que la sesión libre). Lo común del ciclo (crear la
fuente una vez, preparar, "Toca para empezar", pausa con la pestaña oculta, cerrar el contexto
al desmontar) vive en el hook `components/stage/use-audio-stage.ts`, que usan `PracticeSession`
y la Lección. Cada etapa monta su propio escenario (key por etapa y por sesión): un solo
`AudioContext` vivo, cerrado al salir de la etapa. El motor falso queda para muestras y tests.
**Por qué:** roadmap "Lección al reloj real"; una sola implementación del audio evita que la
Lección y la sesión libre se desincronicen (Android/iOS replicarán una).
**Alternativa descartada:** un componente `AudioStage` que envuelva `Stage` (la Lección y la
sesión ponen pies y barras distintos; el hook deja a cada una su `Stage`); mantener el motor
falso en la Lección hasta que haya audio con licencia.
