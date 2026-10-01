/**
 * Reproductor de producción del escenario (D030, D032, spec motor-de-ritmo §6): implementa
 * `StageSource` sobre un único `AudioContext`. La pista (`TrackSource`) y la voz del coach se
 * programan con `start(when)` contra el reloj de audio; el `setInterval` del bucle solo decide
 * *qué* programar en los próximos 200 ms. La vista se deriva en `requestAnimationFrame` de
 * `AudioContext.currentTime` (nunca de un timer), con `stageViewAt` en
 * `posición − latencyOffsetMs`: la calibración mueve la UI, nunca los clips (D032).
 *
 * Voz: sin clips grabados todavía, la cuenta suena como un tono por número y el anuncio del
 * paso como dos tonos (`makeSyntheticClips`, D031); el toggle Voz los silencia.
 *
 * Ciclo: `preparing` (la pista se prepara) → `blocked` (el contexto se crea y se despierta en el
 * toque, iOS lo exige; D122) → `playing` ⇄ `paused` → `ended`. Pestaña oculta o contexto
 * interrumpido (llamada, otra app) → pausa.
 */

import {
  ctxTimeFor,
  DEFAULT_SCHEDULER,
  eventsToSchedule,
  lookaheadWindow,
  resumeAnchor,
  resumeCursor,
  type SchedulerParams,
  trackPositionMs,
} from "../audio/scheduling";
import { makeSyntheticClips } from "../audio/synth";
import type { FakeSession } from "../stage/fake-source";
import type { StageSnapshot, StageSource, StageStatus } from "../stage/source";
import { silentBeatsOf, stageViewAt } from "../stage/view";
import type { TrackSource } from "./track";

/** Margen para el primer toque (el contexto puede tardar en arrancar) y para reanudar. */
export const START_DELAY_S = 0.15;
export const RESUME_DELAY_S = 0.1;
/** Un clip que llega más tarde que esto no suena (D030). */
export const SKIP_IF_LATE_S = 0.05;

/** Lo mínimo de Wake Lock que usa el reproductor. */
export interface WakeLockLike {
  release(): Promise<void>;
  addEventListener(type: "release", fn: () => void): void;
}

/** Lo que el reproductor toma del entorno; los tests lo cambian por un reloj falso. */
export interface PlayerDeps {
  createContext: () => AudioContext;
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (id: unknown) => void;
  requestFrame: (fn: () => void) => unknown;
  cancelFrame: (id: unknown) => void;
  /** `null`: el navegador no tiene Wake Lock. Rechaza si lo deniega. */
  requestWakeLock: () => Promise<WakeLockLike | null>;
  /** Avisa cuando la pestaña se oculta; devuelve cómo dejar de escuchar. */
  onHidden: (fn: () => void) => () => void;
}

/** `AudioContext` con el respaldo `webkitAudioContext` de Safari antiguo. */
export function newAudioContext(): AudioContext {
  const w = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) throw new Error("Este navegador no tiene Web Audio");
  return new Ctor({ latencyHint: "interactive" });
}

const browserDeps = (): PlayerDeps => ({
  createContext: newAudioContext,
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id as ReturnType<typeof setInterval>),
  requestFrame: (fn) => requestAnimationFrame(fn),
  cancelFrame: (id) => cancelAnimationFrame(id as number),
  requestWakeLock: () =>
    "wakeLock" in navigator
      ? navigator.wakeLock.request("screen")
      : Promise.resolve(null),
  onHidden: (fn) => {
    const listener = () => {
      if (document.visibilityState === "hidden") fn();
    };
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  },
});

/** Latencia de salida que reporta el navegador (ms): la de sin calibrar (D032). */
export function reportedLatencyMs(ctx: BaseAudioContext | null): number {
  if (!ctx) return 0;
  const c = ctx as AudioContext;
  const base = typeof c.baseLatency === "number" ? c.baseLatency : 0;
  const output = typeof c.outputLatency === "number" ? c.outputLatency : 0;
  return (base + output) * 1000;
}

export interface AudioStageOptions {
  /** Línea de tiempo y plan con nombres (`sessionStage`). */
  session: FakeSession;
  /** Dónde empieza (y adónde vuelve "Reiniciar"): un poco antes de la entrada. */
  startMs: number;
  /** BPM de la canción: largo del tono del anuncio. */
  bpm: number;
  track: TrackSource;
  /** Calibración guardada del alumno (ms); `null` → la que reporta el navegador (D032, D124). */
  latencyOffsetMs: number | null;
  voice?: boolean;
  scheduler?: SchedulerParams;
  deps?: Partial<PlayerDeps>;
}

export interface AudioStageSource extends StageSource {
  /** Prepara la pista; de `preparing` pasa a `blocked`. Idempotente. */
  prepare(): Promise<void>;
  /**
   * Engancha la pestaña (oculta → pausa). La limpieza lo apaga todo: corta el audio, cierra el
   * contexto, suelta la pista y el Wake Lock (§6: la canción se libera al salir).
   */
  attach(): () => void;
}

export function createAudioStageSource(
  options: AudioStageOptions,
): AudioStageSource {
  const deps: PlayerDeps = {
    ...(typeof window === "undefined" ? ({} as PlayerDeps) : browserDeps()),
    ...options.deps,
  };
  const { timeline, plan } = options.session;
  const { style, events, durationMs } = timeline;
  const silentBeats = silentBeatsOf(style);
  const params = options.scheduler ?? DEFAULT_SCHEDULER;
  const track = options.track;
  const originMs = Math.min(Math.max(options.startMs, 0), durationMs);
  const slugs = plan.map((p) => p.slug);

  let statusKind: StageStatus["kind"] = "preparing";
  let progress = 0;
  let voice = options.voice ?? true;
  let screenMayTurnOff = false;
  let ctx: AudioContext | null = null;
  let trackGain: GainNode | null = null;
  let voiceGain: GainNode | null = null;
  let clips = new Map<string, AudioBuffer>();
  /** Instante del contexto que corresponde a la posición 0 de la pista. */
  let anchor = 0;
  /** Posición desde la que suena el tramo actual: la vista no retrocede durante el margen. */
  let segmentFromMs = originMs;
  /** Posición congelada (en pausa, bloqueado o al terminar). */
  let heldMs = originMs;
  let cursor = 0;
  let timer: unknown = null;
  let frame: unknown = null;
  let wake: WakeLockLike | null = null;
  let wakePending = false;
  let preparing: Promise<void> | null = null;
  /** Sube en cada limpieza: lo asíncrono de antes se descarta. */
  let generation = 0;
  const voiceNodes = new Set<AudioBufferSourceNode>();
  const listeners = new Set<() => void>();

  const positionMs = () =>
    statusKind === "playing" && ctx
      ? Math.max(segmentFromMs, trackPositionMs(ctx.currentTime, anchor))
      : heldMs;
  const latencyMs = () => options.latencyOffsetMs ?? reportedLatencyMs(ctx);

  const build = (): StageSnapshot => ({
    status:
      statusKind === "preparing"
        ? { kind: "preparing", progress }
        : { kind: statusKind },
    view: stageViewAt(timeline, plan, positionMs() - latencyMs()),
    beatsPerPhrase: style.beatsPerPhrase,
    silentBeats,
    voice,
    screenMayTurnOff,
  });

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
      s.screenMayTurnOff,
    ].join("|");

  let snapshot = build();
  let key = keyOf(snapshot);

  const refresh = () => {
    const next = build();
    const nextKey = keyOf(next);
    if (nextKey === key) return;
    key = nextKey;
    snapshot = next;
    for (const l of listeners) l();
  };

  // --- Bucles -------------------------------------------------------------------------------

  const stopFrames = () => {
    if (frame !== null) deps.cancelFrame(frame);
    frame = null;
  };

  /** La vista sigue al reloj de audio en cada frame mientras suena. */
  const frames = () => {
    if (statusKind !== "playing" || listeners.size === 0 || frame !== null) {
      return;
    }
    frame = deps.requestFrame(() => {
      frame = null;
      refresh();
      frames();
    });
  };

  const stopLoop = () => {
    if (timer !== null) deps.clearInterval(timer);
    timer = null;
  };

  const scheduleClip = (clip: string | null, tMs: number, now: number) => {
    const buffer = clip ? clips.get(clip) : undefined;
    if (!ctx || !voiceGain || !buffer) return;
    // Los clips van en su `tMs`, sin restar latencia (D032).
    const ideal = ctxTimeFor(tMs, 0, anchor);
    if (now - ideal > SKIP_IF_LATE_S) return;
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(voiceGain);
    node.onended = () => voiceNodes.delete(node);
    node.start(Math.max(ideal, now));
    voiceNodes.add(node);
  };

  /** Una vuelta del planificador "two clocks" (D030). */
  const tick = () => {
    if (!ctx || statusKind !== "playing") return;
    const now = ctx.currentTime;
    const { fromMs, toMs } = lookaheadWindow(now, anchor, params.lookaheadMs);
    track.pump(fromMs, toMs);
    const { batch, nextCursor } = eventsToSchedule(events, cursor, toMs, 0);
    cursor = nextCursor;
    for (const ev of batch) scheduleClip(ev.clip, ev.tMs, now);
    if (fromMs >= durationMs) finish();
  };

  const startLoop = () => {
    stopLoop();
    timer = deps.setInterval(tick, params.periodMs);
    tick();
  };

  const stopNodes = () => {
    track.stop();
    for (const node of voiceNodes) {
      try {
        node.stop();
      } catch {
        // Ya estaba parado.
      }
    }
    voiceNodes.clear();
  };

  // --- Wake Lock ----------------------------------------------------------------------------

  const requestWake = () => {
    if (wake || wakePending) return;
    wakePending = true;
    const gen = generation;
    deps
      .requestWakeLock()
      .then((sentinel) => {
        wakePending = false;
        if (gen !== generation) {
          void sentinel?.release();
          return;
        }
        screenMayTurnOff = sentinel === null;
        wake = sentinel;
        sentinel?.addEventListener("release", () => {
          if (wake === sentinel) wake = null;
        });
        refresh();
      })
      .catch(() => {
        wakePending = false;
        if (gen !== generation) return;
        screenMayTurnOff = true;
        refresh();
      });
  };

  const releaseWake = () => {
    const sentinel = wake;
    wake = null;
    void sentinel?.release().catch(() => {});
  };

  // --- Contexto -----------------------------------------------------------------------------

  /** Crea o despierta el contexto. Se llama dentro del toque: el `resume` sale sin `await`. */
  const ensureContext = (): AudioContext => {
    if (!ctx) {
      const created = deps.createContext();
      trackGain = created.createGain();
      trackGain.connect(created.destination);
      voiceGain = created.createGain();
      voiceGain.gain.value = voice ? 1 : 0;
      voiceGain.connect(created.destination);
      clips = makeSyntheticClips(created, options.bpm, slugs);
      let wasRunning = created.state === "running";
      created.onstatechange = () => {
        const running = created.state === "running";
        // Suspendido o `interrupted` (iOS) mientras sonaba: el reloj se congela → pausa exacta.
        if (wasRunning && !running && statusKind === "playing") pause();
        wasRunning = running;
      };
      ctx = created;
    }
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    return ctx;
  };

  // --- Comandos -----------------------------------------------------------------------------

  const startAt = (fromMs: number, delayS: number) => {
    const c = ensureContext();
    const now = c.currentTime;
    anchor = resumeAnchor(now, fromMs, delayS);
    segmentFromMs = fromMs;
    if (trackGain) track.start(c, trackGain, anchor, now + delayS);
    cursor = resumeCursor(events, fromMs, 0);
    statusKind = "playing";
    requestWake();
    startLoop();
  };

  const finish = () => {
    stopLoop();
    stopNodes();
    heldMs = durationMs;
    statusKind = "ended";
    releaseWake();
    refresh();
  };

  const pause = () => {
    if (statusKind !== "playing") return;
    heldMs = positionMs();
    stopLoop();
    stopNodes();
    statusKind = "paused";
    refresh();
  };

  const command = (fn: () => void) => {
    fn();
    refresh();
    frames();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      frames();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stopFrames();
      };
    },
    getSnapshot: () => snapshot,
    prepare() {
      if (statusKind !== "preparing") return Promise.resolve();
      if (preparing) return preparing;
      const gen = generation;
      preparing = track
        .prepare((p) => {
          if (gen !== generation) return;
          progress = Math.min(1, Math.max(0, p));
          refresh();
        })
        .then(() => {
          if (gen !== generation) return;
          preparing = null;
          statusKind = "blocked";
          refresh();
        });
      return preparing;
    },
    attach() {
      const offHidden = deps.onHidden(pause);
      return () => {
        offHidden();
        generation++;
        preparing = null;
        if (statusKind === "playing") heldMs = positionMs();
        stopLoop();
        stopFrames();
        stopNodes();
        track.release();
        releaseWake();
        void ctx?.close().catch(() => {});
        ctx = null;
        trackGain = null;
        voiceGain = null;
        clips = new Map();
        // Si se vuelve a enganchar (StrictMode), se prepara otra vez desde la misma posición.
        statusKind = "preparing";
        progress = 0;
        refresh();
      };
    },
    play: () =>
      command(() => {
        switch (statusKind) {
          case "blocked":
            startAt(heldMs, START_DELAY_S);
            break;
          case "paused":
            startAt(heldMs, RESUME_DELAY_S);
            break;
          case "ended":
            startAt(originMs, RESUME_DELAY_S);
            break;
          default:
            break;
        }
      }),
    pause: () => command(pause),
    restart: () =>
      command(() => {
        if (statusKind === "playing" || statusKind === "ended") {
          stopLoop();
          stopNodes();
          startAt(originMs, RESUME_DELAY_S);
        } else if (statusKind === "paused") {
          heldMs = originMs;
        }
      }),
    setVoice: (on) =>
      command(() => {
        voice = on;
        if (ctx && voiceGain)
          voiceGain.gain.setValueAtTime(on ? 1 : 0, ctx.currentTime);
      }),
  };
}
