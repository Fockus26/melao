# D067 · Arquitectura · Escenario sobre `StageSource` (subscribe/getSnapshot + comandos) y `stageViewAt` puro · Implementado

**Decisión:** la UI del escenario solo conoce `StageSource` (`lib/stage/source.ts`): una
instantánea `{ status, view, beatsPerPhrase, silentBeats, voice, screenMayTurnOff }` y los
comandos `play/pause/restart/setVoice`, con la forma de `useSyncExternalStore`. La vista sale
de `stageViewAt(timeline, plan, tMs)` (`lib/stage/view.ts`), pura y probada con los vectores
`timeline-*.json`: tiempo activo por la rejilla con el redondeo de D040, anuncio por el último
`call`/`stepStart`. El motor avisa solo cuando cambia algo visible (tiempo, paso, anuncio,
segundo, estado), nunca por frame. `timeline` lleva además estilo, anclas y duración, porque
los tiempos silenciosos (4 y 8) no tienen evento. Spec: `motor-de-ritmo.md` §6.1.
**Por qué:** el motor real (Web Audio, D030) y los nativos implementan lo mismo sin tocar la
UI; la regla de qué se ve en cada ms queda en una función que Kotlin/Swift replican.
**Alternativa descartada:** que el motor emita eventos (`onBeat`, `onStep`) y la UI acumule
estado: más difícil de probar y se desincroniza al pausar o reiniciar.
