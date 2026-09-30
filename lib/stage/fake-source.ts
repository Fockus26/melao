/**
 * Motor FALSO del escenario: para la muestra `/stage`, los tests y, mientras las canciones no
 * tengan audio (D009), la práctica de la lección con la sesión de `plan-session`
 * (`session-source.ts`). No suena nada y
 * avanza el tiempo con `requestAnimationFrame` y `performance.now()`, que es justo lo que el
 * motor real NO debe hacer: el real programa contra el reloj de Web Audio (D030) y deriva la
 * vista de `AudioContext.currentTime`. Lo que sí es real es el plan y la línea de tiempo: salen
 * del core (`buildTimeline`) igual que en `plan-session`, y la vista, de `stageViewAt`.
 */

import {
  type Anchor,
  beatToMs,
  constantGrid,
} from "../../supabase/functions/_shared/core/grid.ts";
import {
  SALSA_CASINO,
  type StyleConfig,
} from "../../supabase/functions/_shared/core/style.ts";
import {
  buildTimeline,
  roundMs,
} from "../../supabase/functions/_shared/core/timeline.ts";
import type { StageSnapshot, StageSource, StageStatus } from "./source";
import {
  type StagePlanItem,
  type StageTimeline,
  silentBeatsOf,
  stageViewAt,
} from "./view";

export interface FakeStep {
  stepId: string;
  slug: string;
  name: string;
  phrases: number;
}

/**
 * Plan fijo de la muestra (nombres reales de salsa casino, CONTENT_CHECKLIST fila 40):
 * Guapea dos veces seguidas (la segunda no se anuncia: "SE REPITE") y cambios con anuncio.
 */
export const FAKE_STEPS: readonly FakeStep[] = [
  { stepId: "guapea", slug: "guapea", name: "Guapea", phrases: 2 },
  { stepId: "guapea", slug: "guapea", name: "Guapea", phrases: 1 },
  { stepId: "enchufla", slug: "enchufla", name: "Enchufla", phrases: 1 },
  {
    stepId: "dile-que-no",
    slug: "dile-que-no",
    name: "Dile que no",
    phrases: 2,
  },
  { stepId: "sombrero", slug: "sombrero", name: "Sombrero", phrases: 1 },
  { stepId: "setenta", slug: "setenta", name: "Setenta", phrases: 1 },
];

/** BPM de la muestra (el de "Salsa casino · 184 BPM" del handoff). */
export const FAKE_BPM = 184;
/** Música antes de la entrada y después del último paso. */
const INTRO_MS = 1000;
const OUTRO_MS = 1500;
/** Lo que tarda la muestra en "decodificar" la canción. */
const PREPARE_MS = 6000;

export interface FakeSession {
  timeline: StageTimeline;
  plan: StagePlanItem[];
}

/** Plan contiguo desde la frase 0 + rejilla constante + línea de tiempo del core. */
export function fakeSession(
  steps: readonly FakeStep[] = FAKE_STEPS,
  bpm = FAKE_BPM,
  style: StyleConfig = SALSA_CASINO,
): FakeSession {
  const leadInMs = (style.leadInPhrases * style.beatsPerPhrase * 60000) / bpm;
  const anchors: Anchor[] = constantGrid(bpm, roundMs(leadInMs + INTRO_MS));
  let startPhrase = 0;
  const plan = steps.map((s) => {
    const item = { ...s, startPhrase };
    startPhrase += s.phrases;
    return item;
  });
  const events = buildTimeline(style, anchors, plan);
  const end = events[events.length - 1]?.tMs ?? 0;
  return {
    timeline: { style, anchors, events, durationMs: end + OUTRO_MS },
    plan,
  };
}

export interface FakeStageOptions {
  steps?: readonly FakeStep[];
  /** Sesión ya armada (p. ej. la de `plan-session`); reemplaza `steps` y `bpm`. */
  session?: FakeSession;
  /** Punto de partida y de "Reiniciar" (ms del audio); por defecto, 0. */
  startAtMs?: number;
  bpm?: number;
  status?: StageStatus["kind"];
  /** Empieza en este beat de la rejilla (para llegar a un momento concreto de la muestra). */
  startAtBeat?: number;
  /** Instantánea: el tiempo no avanza hasta el primer comando. */
  frozen?: boolean;
  voice?: boolean;
  screenMayTurnOff?: boolean;
  prepareMs?: number;
  /** Reloj y frames inyectables (tests). */
  now?: () => number;
  requestFrame?: (cb: () => void) => unknown;
  cancelFrame?: (id: unknown) => void;
}

const hasWindow = () => typeof requestAnimationFrame === "function";

export function createFakeStageSource(
  options: FakeStageOptions = {},
): StageSource {
  const { timeline, plan } =
    options.session ?? fakeSession(options.steps, options.bpm);
  const { style, anchors, durationMs } = timeline;
  const silentBeats = silentBeatsOf(style);
  const now = options.now ?? (() => performance.now());
  const requestFrame =
    options.requestFrame ??
    ((cb: () => void) => (hasWindow() ? requestAnimationFrame(cb) : null));
  const cancelFrame =
    options.cancelFrame ??
    ((id: unknown) => {
      if (hasWindow() && typeof id === "number") cancelAnimationFrame(id);
    });
  const prepareMs = options.prepareMs ?? PREPARE_MS;

  const originMs = Math.min(Math.max(options.startAtMs ?? 0, 0), durationMs);
  // Un poco dentro del beat pedido para no caer justo en el borde del redondeo.
  let baseMs =
    options.startAtBeat === undefined
      ? originMs
      : roundMs(beatToMs(anchors, options.startAtBeat)) + 10;
  let startedAt = now();
  let frozen = options.frozen ?? false;
  let statusKind: StageStatus["kind"] = options.status ?? "blocked";
  const prepareStart = now();
  let progress = 0;
  let voice = options.voice ?? true;
  const screenMayTurnOff = options.screenMayTurnOff ?? false;
  if (statusKind === "ended") baseMs = durationMs;

  const listeners = new Set<() => void>();
  let frame: unknown = null;
  let snapshot: StageSnapshot;
  let key = "";

  const running = () => statusKind === "playing" && !frozen;
  const positionMs = () => (running() ? baseMs + (now() - startedAt) : baseMs);

  const build = (): StageSnapshot => {
    const status: StageStatus =
      statusKind === "preparing"
        ? { kind: "preparing", progress }
        : { kind: statusKind };
    return {
      status,
      view: stageViewAt(timeline, plan, positionMs()),
      beatsPerPhrase: style.beatsPerPhrase,
      silentBeats,
      voice,
      screenMayTurnOff,
    };
  };

  // Solo lo que se ve: si nada cambió, la misma referencia (useSyncExternalStore).
  const keyOf = (s: StageSnapshot) =>
    [
      s.status.kind,
      Math.round(progress * 100),
      s.view.section,
      s.view.beat,
      s.view.current?.stepId,
      s.view.phrase?.index,
      s.view.announced,
      Math.floor(s.view.positionMs / 1000),
      s.voice,
    ].join("|");

  const refresh = () => {
    const next = build();
    const nextKey = keyOf(next);
    if (nextKey === key) return;
    key = nextKey;
    snapshot = next;
    for (const l of listeners) l();
  };

  const tick = () => {
    frame = null;
    if (statusKind === "preparing") {
      progress = Math.min(1, (now() - prepareStart) / prepareMs);
      if (progress >= 1) statusKind = "blocked";
    } else if (running() && positionMs() >= durationMs) {
      baseMs = durationMs;
      statusKind = "ended";
    }
    refresh();
    loop();
  };

  const loop = () => {
    const active = statusKind === "preparing" || running();
    if (active && listeners.size > 0 && frame === null) {
      frame = requestFrame(tick);
    }
  };

  const command = (fn: () => void) => {
    if (frozen) {
      // Descongela sin saltar: el reloj sigue desde la instantánea.
      frozen = false;
      startedAt = now();
    }
    fn();
    refresh();
    loop();
  };

  snapshot = build();
  key = keyOf(snapshot);

  return {
    subscribe(listener) {
      listeners.add(listener);
      loop();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && frame !== null) {
          cancelFrame(frame);
          frame = null;
        }
      };
    },
    getSnapshot: () => snapshot,
    play: () =>
      command(() => {
        if (statusKind === "preparing" || statusKind === "playing") return;
        if (statusKind === "ended") baseMs = originMs;
        startedAt = now();
        statusKind = "playing";
      }),
    pause: () =>
      command(() => {
        if (statusKind !== "playing") return;
        baseMs = positionMs();
        statusKind = "paused";
      }),
    restart: () =>
      command(() => {
        if (statusKind === "preparing" || statusKind === "blocked") return;
        baseMs = originMs;
        startedAt = now();
        if (statusKind === "ended") statusKind = "playing";
      }),
    setVoice: (on) =>
      command(() => {
        voice = on;
      }),
  };
}
