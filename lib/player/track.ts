/**
 * Fuente de la pista del reproductor (lo que suena debajo del coach). El reproductor no sabe
 * si la música es un archivo o algo sintetizado: le dice a la fuente dónde cae la posición 0
 * de la pista en el reloj del contexto y, en cada vuelta del bucle (D030), qué ventana de la
 * pista viene. Todo lo que suena se fija con `start(when)` en el mismo `AudioContext` que la
 * voz, así comparten la latencia de salida (spec motor-de-ritmo §6).
 *
 * Implementaciones:
 * - `SyntheticTrack` (`synthetic-track.ts`): campana y bombo desde la rejilla de la canción,
 *   mientras no hay audio con licencia (D009, D121).
 * - `FileTrack` (pendiente): la canción de Storage decodificada con `decodeAudioData` en
 *   `prepare` (progreso real) y tocada con un `AudioBufferSourceNode` en `start`
 *   (`trackStartArgs` de `lib/audio/scheduling.ts`); `pump` no hace nada y `release` suelta el
 *   buffer (una sola canción decodificada a la vez, §6).
 */

export interface TrackSource {
  /** Duración de la pista en ms. */
  readonly durationMs: number;
  /** Prepara la pista (decodificar o calcular); `onProgress` de 0 a 1. */
  prepare(onProgress: (progress: number) => void): Promise<void>;
  /**
   * Empieza a sonar en `startAtCtx` (segundos del contexto) con la posición 0 de la pista en
   * `trackStartCtx`, que puede estar en el pasado (se entra con offset).
   */
  start(
    ctx: BaseAudioContext,
    out: AudioNode,
    trackStartCtx: number,
    startAtCtx: number,
  ): void;
  /** Vuelta del bucle: programa lo que cae en `[fromMs, toMs)` de la pista. */
  pump(fromMs: number, toMs: number): void;
  /** Corta todo lo programado (pausa, reiniciar, salir). */
  stop(): void;
  /** Suelta lo preparado; hay que volver a llamar a `prepare` para sonar. */
  release(): void;
}
