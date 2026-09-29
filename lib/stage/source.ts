/**
 * Contrato entre el escenario (UI) y el motor que lo mueve. La UI no sabe de Web Audio: se
 * suscribe, pinta la instantánea y manda comandos. Encaja con `useSyncExternalStore`
 * (`subscribe` + `getSnapshot` con la misma referencia mientras nada cambie).
 *
 * Hoy lo implementa el motor falso (`fake-source.ts`, solo para la muestra); el reproductor
 * real (reloj de Web Audio, D030) implementará lo mismo. Ninguna implementación avisa en cada
 * frame: solo cuando cambia algo que se ve (tiempo, paso, anuncio, segundo, estado).
 */

import type { StageView } from "./view";

export type StageStatus =
  /** Decodificando la canción; `progress` de 0 a 1. */
  | { kind: "preparing"; progress: number }
  /** Audio listo pero el navegador exige un toque para sonar ("Toca para empezar"). */
  | { kind: "blocked" }
  | { kind: "playing" }
  | { kind: "paused" }
  | { kind: "ended" };

export interface StageSnapshot {
  status: StageStatus;
  /** Vista en la posición actual (ya con `latencyOffsetMs`, D032). */
  view: StageView;
  beatsPerPhrase: number;
  /** Tiempos que no se cuentan (4 y 8 en salsa): la tira y la cuenta pintan "·". */
  silentBeats: readonly number[];
  /** Voz del coach activa (cuenta y anuncios). */
  voice: boolean;
  /** No se pudo mantener la pantalla encendida (Wake Lock rechazado o sin soporte). */
  screenMayTurnOff: boolean;
}

/** Los métodos no dependen de `this`: se pasan sueltos (`onClick={source.play}`). */
export interface StageSource {
  subscribe(listener: () => void): () => void;
  getSnapshot(): StageSnapshot;
  /** Empieza o reanuda; desde `blocked` es el toque que desbloquea el audio. */
  play(): void;
  pause(): void;
  /** Vuelve al inicio de la canción conservando si suena o está en pausa. */
  restart(): void;
  setVoice(on: boolean): void;
}
