import type { FakeStageOptions, FakeStep } from "@/lib/stage/fake-source";

/**
 * Estados de la muestra `/stage` (handoff §3 Sesión › Estados). Textos de la muestra:
 * CONTENT_CHECKLIST fila 40. Las "instantáneas" arrancan congeladas en un momento concreto
 * (para capturas y revisión); el primer comando las pone en marcha.
 */

/** Nombres de 32 y 31 caracteres para el caso límite (placeholder, fila 40). */
export const LONG_STEPS: readonly FakeStep[] = [
  { stepId: "guapea", slug: "guapea", name: "Guapea", phrases: 1 },
  {
    stepId: "vuelta-dama-espalda",
    slug: "vuelta-dama-espalda",
    name: "Vuelta de la dama por la espalda",
    phrases: 1,
  },
  {
    stepId: "dile-que-no-vuelta",
    slug: "dile-que-no-vuelta",
    name: "Dile que no y vuelta por detrás",
    phrases: 1,
  },
  { stepId: "sombrero", slug: "sombrero", name: "Sombrero", phrases: 1 },
];

export interface DemoState {
  label: string;
  options: FakeStageOptions;
  exitOpen?: boolean;
}

export const DEMO_STATES = {
  playing: { label: "Reproduciendo", options: { status: "playing" } },
  announcement: {
    label: "Anuncio en el 5 (instantánea)",
    options: { status: "playing", frozen: true, startAtBeat: 21 },
  },
  repeat: {
    label: "Se repite (instantánea)",
    options: { status: "playing", frozen: true, startAtBeat: 13 },
  },
  preparing: { label: "Preparando audio", options: { status: "preparing" } },
  blocked: { label: "Audio bloqueado", options: { status: "blocked" } },
  paused: {
    label: "En pausa",
    options: { status: "paused", startAtBeat: 36 },
  },
  "screen-off": {
    label: "La pantalla puede apagarse",
    options: { status: "playing", screenMayTurnOff: true },
  },
  "no-voice": {
    label: "Cuenta en silencio",
    options: { status: "playing", voice: false },
  },
  exit: {
    label: "Salir a mitad",
    options: { status: "paused", startAtBeat: 21 },
    exitOpen: true,
  },
  "long-name": {
    label: "Nombre de 32 caracteres a 220 BPM (instantánea)",
    options: {
      status: "playing",
      frozen: true,
      startAtBeat: 13,
      bpm: 220,
      steps: LONG_STEPS,
    },
  },
  ended: { label: "Terminada", options: { status: "ended" } },
} satisfies Record<string, DemoState>;

export type DemoStateId = keyof typeof DEMO_STATES;

export function isDemoState(id: unknown): id is DemoStateId {
  return typeof id === "string" && Object.hasOwn(DEMO_STATES, id);
}
