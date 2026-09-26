/**
 * Motor del spike de audio (07a·1): reproduce una pista y programa los clips del coach en
 * el reloj de Web Audio, y mide memoria, deriva, latencia, Wake Lock y ciclo de vida.
 *
 * No es el reproductor final: es la herramienta para medir en teléfonos reales qué aguanta
 * la web. Sin React; la página `app/spike/audio` solo lo pinta. Todo lo que suena va por un
 * único `AudioContext` y se fija con `start(when)`; el `setInterval` del bucle solo decide
 * qué programar (D030).
 */

import { type Anchor, beatToMs, constantGrid, msToBeat } from "./grid";
import {
  ctxTimeFor,
  DEFAULT_SCHEDULER,
  eventsToSchedule,
  lookaheadWindow,
  programmedMs,
  resumeAnchor,
  resumeCursor,
  type SchedulerParams,
  trackPositionMs,
  trackStartArgs,
} from "./scheduling";
import {
  type ClockSample,
  clockDrift,
  mean,
  stdDev,
  tapOffsetsMs,
} from "./stats";
import {
  audioBufferBytes,
  makeSyntheticClips,
  renderSyntheticTrack,
} from "./synth";
import {
  buildSpikeSession,
  type PlanItem,
  SALSA_CASINO,
  type TimelineEvent,
} from "./timeline";

export type EngineState =
  | "idle"
  | "preparing"
  | "ready"
  | "playing"
  | "paused"
  | "interrupted"
  | "calibrating"
  | "ended"
  | "error";

export interface LogEntry {
  /** `performance.now()` redondeado (ms). */
  atMs: number;
  /** `AudioContext.currentTime` (s) si había contexto. */
  ctxTime: number | null;
  type: string;
  detail?: string;
}

export interface DriftStats {
  scheduled: number;
  /** Clips cuyo `when` ideal ya había pasado al programarlos. */
  late: number;
  /** Clips tardíos > 50 ms que no se tocaron. */
  skipped: number;
  maxAbsDriftMs: number;
  /** Menor anticipación con que se programó un clip (ms). */
  minMarginMs: number | null;
}

export interface CalibrationRun {
  label: string;
  taps: number;
  /** Desfase medio del toque con el reloj de programación (`currentTime`): latencia real total. */
  meanMs: number;
  sdMs: number;
  /** Mismo desfase con `getOutputTimestamp()`: si el navegador compensa bien, ≈ solo el error humano. */
  meanOutputMs: number | null;
  sdOutputMs: number | null;
  /** `baseLatency + outputLatency` que reporta el navegador (ms). */
  reportedLatencyMs: number | null;
  offsetsMs: number[];
}

export interface SourceInfo {
  kind: "synthetic" | "file";
  name: string;
  bpm: number;
  firstOneMs: number;
  durationS: number;
}

export interface EngineSnapshot {
  state: EngineState;
  error: string | null;
  ctxState: string | null;
  source: SourceInfo | null;
  memory: {
    bufferBytes: number;
    prepareMs: number;
    fileBytes: number | null;
    heapBeforeBytes: number | null;
    heapAfterBytes: number | null;
  } | null;
  eventCount: number;
  plan: PlanItem[];
  params: SchedulerParams;
  latencyOffsetMs: number;
  applyOffsetToClips: boolean;
  drift: { total: DriftStats; sinceResume: DriftStats; resumes: number };
  clock: {
    segmentDriftMs: number | null;
    segmentPpm: number | null;
    segmentElapsedS: number | null;
    worstAbsPpm: number | null;
  };
  wakeLock: {
    supported: boolean;
    status: string;
    requests: number;
    releases: number;
  };
  latency: {
    baseLatencyMs: number | null;
    outputLatencyMs: number | null;
  };
  calibrations: CalibrationRun[];
  calibrating: { label: string; taps: number; target: number } | null;
  positionMs: number;
  recovered: string[];
  log: LogEntry[];
}

export interface CurrentView {
  beat: number | null;
  beatInPhrase: number | null;
  step: string | null;
}

const KEY_PREPARE = "melao-spike:preparing";
const KEY_SESSION = "melao-spike:session";
const START_DELAY_S = 0.15;
const RESUME_DELAY_S = 0.1;
const SKIP_IF_LATE_S = 0.05;
const CALIBRATION_TAPS = 16;
const LOG_MAX = 300;

type MemoryPerformance = Performance & {
  memory?: { usedJSHeapSize: number };
};

function heapBytes(): number | null {
  if (typeof performance === "undefined") return null;
  return (performance as MemoryPerformance).memory?.usedJSHeapSize ?? null;
}

function storageGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento (modo privado): la marca de recarga no se podrá leer.
  }
}

function emptyDrift(): DriftStats {
  return {
    scheduled: 0,
    late: 0,
    skipped: 0,
    maxAbsDriftMs: 0,
    minMarginMs: null,
  };
}

function errorText(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

export class SpikeEngine {
  private ctx: AudioContext | null = null;
  private trackGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private track: AudioBuffer | null = null;
  private clips = new Map<string, AudioBuffer>();
  private anchors: Anchor[] = [];
  private events: TimelineEvent[] = [];
  private endMs = 0;

  /** Instante del contexto que corresponde a la posición 0 de la pista. */
  private trackStartCtx = 0;
  private trackSrc: {
    node: AudioBufferSourceNode;
    when: number;
    offsetS: number;
  } | null = null;
  private voiceNodes = new Set<AudioBufferSourceNode>();
  private cursor = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastEmit = 0;
  private lastHeartbeat = 0;
  private lastClockSample = 0;
  private clockSegment: ClockSample[] = [];
  private accentsCtx: number[] = [];
  private tapsSched: number[] = [];
  private tapsOutput: number[] = [];
  private calLabel = "";
  private wakeLock: WakeLockSentinel | null = null;
  private listeners = new Set<() => void>();
  private detachFns: (() => void)[] = [];

  private snap: EngineSnapshot = {
    state: "idle",
    error: null,
    ctxState: null,
    source: null,
    memory: null,
    eventCount: 0,
    plan: [],
    params: { ...DEFAULT_SCHEDULER },
    latencyOffsetMs: 0,
    applyOffsetToClips: false,
    drift: { total: emptyDrift(), sinceResume: emptyDrift(), resumes: 0 },
    clock: {
      segmentDriftMs: null,
      segmentPpm: null,
      segmentElapsedS: null,
      worstAbsPpm: null,
    },
    wakeLock: {
      supported: false,
      status: "sin pedir",
      requests: 0,
      releases: 0,
    },
    latency: { baseLatencyMs: null, outputLatencyMs: null },
    calibrations: [],
    calibrating: null,
    positionMs: 0,
    recovered: [],
    log: [],
  };

  // --- Suscripción (useSyncExternalStore) -------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): EngineSnapshot => this.snap;

  private update(patch: Partial<EngineSnapshot>): void {
    this.snap = { ...this.snap, ...patch };
    this.lastEmit = performance.now();
    for (const l of this.listeners) l();
  }

  private log(type: string, detail?: string): void {
    const entry: LogEntry = {
      atMs: Math.round(performance.now()),
      ctxTime: this.ctx ? Number(this.ctx.currentTime.toFixed(4)) : null,
      type,
      ...(detail ? { detail } : {}),
    };
    this.update({ log: [...this.snap.log, entry].slice(-LOG_MAX) });
  }

  // --- Ciclo de vida de la página ---------------------------------------------------------

  /** Engancha los eventos de la página y lee el rastro de una carga anterior que murió. */
  attach(): () => void {
    const recovered: string[] = [];
    const prep = storageGet(KEY_PREPARE);
    if (prep) {
      recovered.push(
        `La pestaña se recargó mientras preparaba el audio (${prep}). Posible falta de memoria.`,
      );
      storageSet(KEY_PREPARE, null);
    }
    const sess = storageGet(KEY_SESSION);
    if (sess) {
      recovered.push(
        `La pestaña se recargó con una sesión en curso (${sess}). Posible falta de memoria o descarte en segundo plano.`,
      );
      storageSet(KEY_SESSION, null);
    }
    const doc = document as Document & { wasDiscarded?: boolean };
    if (doc.wasDiscarded) {
      recovered.push(
        "document.wasDiscarded = true: el navegador descartó la pestaña.",
      );
    }
    this.update({
      recovered,
      wakeLock: { ...this.snap.wakeLock, supported: "wakeLock" in navigator },
    });

    const on = <K extends string>(
      target: EventTarget,
      type: K,
      fn: (e: Event) => void,
    ) => {
      target.addEventListener(type, fn);
      this.detachFns.push(() => target.removeEventListener(type, fn));
    };
    on(document, "visibilitychange", () => {
      this.log("visibilitychange", document.visibilityState);
      if (
        document.visibilityState === "visible" &&
        this.isSessionActive() &&
        !this.wakeLock
      ) {
        void this.requestWakeLock();
      }
    });
    on(window, "pagehide", (e) => {
      this.log("pagehide", `persisted=${(e as PageTransitionEvent).persisted}`);
    });
    on(window, "pageshow", (e) => {
      this.log("pageshow", `persisted=${(e as PageTransitionEvent).persisted}`);
    });
    // Page Lifecycle (Chrome): congelación en segundo plano.
    on(document, "freeze", () => this.log("freeze"));
    on(document, "resume", () => this.log("resume (page lifecycle)"));

    return () => {
      for (const fn of this.detachFns) fn();
      this.detachFns = [];
      this.stopLoop();
      this.stopAllNodes();
      void this.wakeLock?.release();
    };
  }

  private isSessionActive(): boolean {
    return ["playing", "paused", "interrupted", "calibrating"].includes(
      this.snap.state,
    );
  }

  // --- Contexto de audio ------------------------------------------------------------------

  /** Crea o despierta el contexto. Debe llamarse dentro del gesto del usuario (iOS). */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      this.trackGain = ctx.createGain();
      this.trackGain.connect(ctx.destination);
      this.voiceGain = ctx.createGain();
      this.voiceGain.connect(ctx.destination);
      ctx.onstatechange = () => this.onContextState();
      this.ctx = ctx;
      this.log("audiocontext", `creado, sampleRate=${ctx.sampleRate}`);
    }
    if (this.ctx.state !== "running") {
      // Sin await: el resume tiene que salir dentro del gesto.
      this.ctx.resume().catch((e) => this.log("resume-error", errorText(e)));
    }
    this.readLatency();
    return this.ctx;
  }

  private readLatency(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.update({
      ctxState: ctx.state,
      latency: {
        baseLatencyMs:
          typeof ctx.baseLatency === "number" ? ctx.baseLatency * 1000 : null,
        outputLatencyMs:
          typeof ctx.outputLatency === "number"
            ? ctx.outputLatency * 1000
            : null,
      },
    });
  }

  private onContextState(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    // `interrupted` es de iOS (llamada, bloqueo, otra app con audio).
    this.log("statechange", ctx.state);
    this.update({ ctxState: ctx.state });
    if (
      ctx.state !== "running" &&
      (this.snap.state === "playing" || this.snap.state === "calibrating")
    ) {
      // El reloj se congela al suspenderse: la posición leída ahora es exacta.
      const positionMs = trackPositionMs(ctx.currentTime, this.trackStartCtx);
      this.stopLoop();
      this.stopAllNodes();
      if (this.snap.state === "calibrating") {
        this.update({ state: "ready", calibrating: null, positionMs: 0 });
        this.log("calibración cancelada", "el contexto dejó de sonar");
      } else {
        this.update({ state: "interrupted", positionMs });
      }
    }
  }

  // --- Preparar el audio ------------------------------------------------------------------

  async prepareSynthetic(bpm: number): Promise<void> {
    this.ensureContext();
    // Beat 0 tras una frase de entrada completa y medio segundo de colchón.
    const firstOneMs = Math.round((8 * 60000) / bpm + 500);
    const anchors = constantGrid(bpm, firstOneMs);
    await this.prepare(
      { kind: "synthetic", name: "pista sintética", bpm, firstOneMs },
      anchors,
      null,
      () => renderSyntheticTrack(anchors),
    );
  }

  async prepareFile(
    file: File,
    bpm: number,
    firstOneMs: number,
  ): Promise<void> {
    const ctx = this.ensureContext();
    await this.prepare(
      { kind: "file", name: file.name, bpm, firstOneMs },
      constantGrid(bpm, firstOneMs),
      file.size,
      async () => ctx.decodeAudioData(await file.arrayBuffer()),
    );
  }

  private async prepare(
    source: Omit<SourceInfo, "durationS">,
    anchors: Anchor[],
    fileBytes: number | null,
    load: () => Promise<AudioBuffer>,
  ): Promise<void> {
    if (this.isSessionActive() || this.snap.state === "preparing") return;
    const ctx = this.ctx;
    if (!ctx) return;
    this.track = null;
    this.update({
      state: "preparing",
      error: null,
      memory: null,
      source: null,
    });
    storageSet(
      KEY_PREPARE,
      `${source.kind} ${source.name}${fileBytes ? `, ${fileBytes} bytes` : ""}`,
    );
    const heapBeforeBytes = heapBytes();
    const t0 = performance.now();
    try {
      const track = await load();
      const prepareMs = Math.round(performance.now() - t0);
      const durationS = track.duration;
      const { plan, events } = buildSpikeSession(
        SALSA_CASINO,
        anchors,
        durationS * 1000 - 500,
      );
      this.track = track;
      this.anchors = anchors;
      this.events = events;
      this.endMs = events.at(-1)?.tMs ?? durationS * 1000;
      this.clips = makeSyntheticClips(
        ctx,
        source.bpm,
        plan.map((p) => p.slug),
      );
      this.update({
        state: "ready",
        source: { ...source, durationS },
        memory: {
          bufferBytes: audioBufferBytes(track),
          prepareMs,
          fileBytes,
          heapBeforeBytes,
          heapAfterBytes: heapBytes(),
        },
        eventCount: events.length,
        plan,
        positionMs: 0,
      });
      this.log(
        "preparado",
        `${source.kind}, ${durationS.toFixed(1)} s, ${events.length} eventos, ${prepareMs} ms`,
      );
    } catch (e) {
      this.update({ state: "error", error: errorText(e) });
      this.log("error al preparar", errorText(e));
    } finally {
      storageSet(KEY_PREPARE, null);
    }
  }

  // --- Reproducción -----------------------------------------------------------------------

  /** Offset que se aplica a los clips (0 salvo que se active el interruptor). */
  private clipOffsetMs(): number {
    return this.snap.applyOffsetToClips ? this.snap.latencyOffsetMs : 0;
  }

  start(): void {
    if (!this.track || !["ready", "ended"].includes(this.snap.state)) return;
    const ctx = this.ensureContext();
    this.trackStartCtx =
      ctx.currentTime + START_DELAY_S + Math.max(0, this.clipOffsetMs()) / 1000;
    this.startTrack(this.trackStartCtx);
    this.cursor = 0;
    this.newClockSegment();
    this.update({
      state: "playing",
      positionMs: 0,
      drift: { total: emptyDrift(), sinceResume: emptyDrift(), resumes: 0 },
    });
    this.log("iniciar");
    void this.requestWakeLock();
    this.startLoop();
  }

  pause(): void {
    const ctx = this.ctx;
    if (!ctx || this.snap.state !== "playing") return;
    const positionMs = trackPositionMs(ctx.currentTime, this.trackStartCtx);
    this.stopLoop();
    this.stopAllNodes();
    this.update({ state: "paused", positionMs });
    this.log("pausar", `posición ${Math.round(positionMs)} ms`);
    this.heartbeat(true);
  }

  /** Reanuda desde la posición guardada; la línea de tiempo se recalcula desde el reloj. */
  async resume(): Promise<void> {
    if (!["paused", "interrupted"].includes(this.snap.state)) return;
    const ctx = this.ensureContext();
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch (e) {
        this.log("resume-error", errorText(e));
      }
    }
    if (ctx.state !== "running") {
      this.log("reanudar fallido", `contexto en ${ctx.state}`);
      this.update({ ctxState: ctx.state });
      return;
    }
    const positionMs = this.snap.positionMs;
    const now = ctx.currentTime;
    this.trackStartCtx = resumeAnchor(now, positionMs, RESUME_DELAY_S);
    this.startTrack(now + RESUME_DELAY_S);
    this.cursor = resumeCursor(this.events, positionMs, this.clipOffsetMs());
    this.newClockSegment();
    this.update({
      state: "playing",
      ctxState: ctx.state,
      drift: {
        ...this.snap.drift,
        sinceResume: emptyDrift(),
        resumes: this.snap.drift.resumes + 1,
      },
    });
    this.log("reanudar", `desde ${Math.round(positionMs)} ms`);
    if (!this.wakeLock) void this.requestWakeLock();
    this.startLoop();
  }

  /** Salir: corta todo y deja lista la pista para volver a empezar. */
  exit(): void {
    if (!this.isSessionActive() && this.snap.state !== "ended") return;
    this.stopLoop();
    this.stopAllNodes();
    void this.wakeLock?.release();
    storageSet(KEY_SESSION, null);
    this.update({ state: "ready", positionMs: 0, calibrating: null });
    this.log("salir");
  }

  private startTrack(startAtCtx: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.track || !this.trackGain) return;
    const node = ctx.createBufferSource();
    node.buffer = this.track;
    node.connect(this.trackGain);
    const { when, offsetS } = trackStartArgs(this.trackStartCtx, startAtCtx);
    node.start(when, offsetS);
    this.trackSrc = { node, when, offsetS };
  }

  private stopAllNodes(): void {
    try {
      this.trackSrc?.node.stop();
    } catch {
      // Ya estaba parado.
    }
    this.trackSrc = null;
    for (const n of this.voiceNodes) {
      try {
        n.stop();
      } catch {
        // Ya estaba parado.
      }
    }
    this.voiceNodes.clear();
  }

  private startLoop(): void {
    this.stopLoop();
    this.timer = setInterval(() => this.tick(), this.snap.params.periodMs);
    this.tick();
  }

  private stopLoop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  /** Una vuelta del bucle "two clocks": programa lo que cae en la ventana siguiente. */
  private tick(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const positionMs = trackPositionMs(now, this.trackStartCtx);

    if (this.snap.state === "playing") {
      const offset = this.clipOffsetMs();
      const { toMs } = lookaheadWindow(
        now,
        this.trackStartCtx,
        this.snap.params.lookaheadMs,
      );
      const { batch, nextCursor } = eventsToSchedule(
        this.events,
        this.cursor,
        toMs,
        offset,
      );
      this.cursor = nextCursor;
      for (const ev of batch) this.scheduleEvent(ev, now, offset);
      if (positionMs >= this.endMs + 500) {
        this.finish();
        return;
      }
    } else if (this.snap.state === "calibrating") {
      const lastAccent = this.accentsCtx.at(-1) ?? 0;
      if (now > lastAccent + 1) {
        this.finishCalibration();
        return;
      }
    } else {
      return;
    }

    const perfNow = performance.now();
    if (perfNow - this.lastClockSample > 1000) {
      this.lastClockSample = perfNow;
      this.sampleClock();
    }
    this.heartbeat(false, positionMs);
    if (perfNow - this.lastEmit > 250) this.update({ positionMs });
  }

  private scheduleEvent(ev: TimelineEvent, now: number, offset: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.voiceGain || !this.trackSrc) return;
    if (ev.kind === "end") this.log("fin de la línea de tiempo");
    if (!ev.clip) return;
    const buffer = this.clips.get(ev.clip);
    if (!buffer) return;

    const ideal = ctxTimeFor(ev.tMs, offset, this.trackStartCtx);
    const marginMs = (ideal - now) * 1000;
    let when = ideal;
    let late = false;
    let skipped = false;
    if (ideal < now) {
      late = true;
      if (now - ideal > SKIP_IF_LATE_S) skipped = true;
      when = now;
    }
    // Deriva medida contra la fuente real de la pista (su `when` y `offset`), no contra el
    // ancla: así también se valida la matemática de reanudar.
    const trackPosS = this.trackSrc.offsetS + (when - this.trackSrc.when);
    const driftMs = trackPosS * 1000 - programmedMs(ev.tMs, offset);

    const bump = (s: DriftStats): DriftStats => ({
      scheduled: s.scheduled + (skipped ? 0 : 1),
      late: s.late + (late ? 1 : 0),
      skipped: s.skipped + (skipped ? 1 : 0),
      maxAbsDriftMs: skipped
        ? s.maxAbsDriftMs
        : Math.max(s.maxAbsDriftMs, Math.abs(driftMs)),
      minMarginMs:
        s.minMarginMs === null ? marginMs : Math.min(s.minMarginMs, marginMs),
    });
    this.snap = {
      ...this.snap,
      drift: {
        ...this.snap.drift,
        total: bump(this.snap.drift.total),
        sinceResume: bump(this.snap.drift.sinceResume),
      },
    };
    if (late) {
      this.log(
        skipped ? "clip omitido (tarde)" : "clip tarde",
        `${ev.clip} ${Math.round(-marginMs)} ms tarde`,
      );
    }
    if (skipped) return;

    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(this.voiceGain);
    node.onended = () => this.voiceNodes.delete(node);
    node.start(when);
    this.voiceNodes.add(node);
  }

  private finish(): void {
    this.stopLoop();
    this.stopAllNodes();
    void this.wakeLock?.release();
    storageSet(KEY_SESSION, null);
    this.sampleClock();
    this.update({ state: "ended" });
    this.log("fin de la pista");
  }

  private heartbeat(force: boolean, positionMs = this.snap.positionMs): void {
    const perfNow = performance.now();
    if (!force && perfNow - this.lastHeartbeat < 2000) return;
    this.lastHeartbeat = perfNow;
    storageSet(
      KEY_SESSION,
      `${this.snap.state} en ${Math.round(positionMs)} ms, ${new Date().toISOString()}`,
    );
  }

  // --- Reloj ------------------------------------------------------------------------------

  private newClockSegment(): void {
    this.clockSegment = [];
    this.lastClockSample = 0;
  }

  private sampleClock(): void {
    const ctx = this.ctx;
    if (!ctx || typeof ctx.getOutputTimestamp !== "function") return;
    const ts = ctx.getOutputTimestamp();
    if (!ts.contextTime || !ts.performanceTime) return;
    this.clockSegment.push({
      contextTime: ts.contextTime,
      performanceTime: ts.performanceTime,
    });
    const d = clockDrift(this.clockSegment);
    if (!d) return;
    const worst = this.snap.clock.worstAbsPpm;
    this.snap = {
      ...this.snap,
      clock: {
        segmentDriftMs: d.driftMs,
        segmentPpm: d.ppm,
        segmentElapsedS: d.elapsedS,
        // Solo cuenta tras 10 s: con pocos segundos la pendiente es ruido.
        worstAbsPpm:
          d.elapsedS < 10 ? worst : Math.max(worst ?? 0, Math.abs(d.ppm)),
      },
    };
  }

  // --- Calibración por toques -------------------------------------------------------------

  /** Suena solo la pista; el usuario toca en cada acento (1 y 5 de la frase: 16 compases). */
  calibrate(label: string): void {
    if (!this.track || !["ready", "ended"].includes(this.snap.state)) return;
    const ctx = this.ensureContext();
    this.trackStartCtx = ctx.currentTime + START_DELAY_S;
    this.startTrack(this.trackStartCtx);
    // Acentos: el bombo en el 1 y el 5 de cada frase, desde la entrada.
    const firstBeat = Math.ceil(msToBeat(this.anchors, 0));
    const accents: number[] = [];
    for (let b = firstBeat; accents.length < CALIBRATION_TAPS + 4; b++) {
      const n = (((b % 8) + 8) % 8) + 1;
      if (n === 1 || n === 5) {
        const tMs = beatToMs(this.anchors, b);
        if (tMs >= 0) accents.push(this.trackStartCtx + tMs / 1000);
      }
    }
    this.accentsCtx = accents;
    this.tapsSched = [];
    this.tapsOutput = [];
    this.calLabel = label;
    this.newClockSegment();
    this.update({
      state: "calibrating",
      calibrating: { label, taps: 0, target: CALIBRATION_TAPS },
    });
    this.log("calibrar", label);
    void this.requestWakeLock();
    this.startLoop();
  }

  /** Registra un toque. `eventTimeStamp` = `event.timeStamp` (mismo reloj que `performance.now()`). */
  tap(eventTimeStamp: number): void {
    const ctx = this.ctx;
    if (!ctx || this.snap.state !== "calibrating") return;
    const ageS = (performance.now() - eventTimeStamp) / 1000;
    this.tapsSched.push(ctx.currentTime - ageS);
    if (typeof ctx.getOutputTimestamp === "function") {
      const ts = ctx.getOutputTimestamp();
      if (ts.contextTime && ts.performanceTime) {
        this.tapsOutput.push(
          ts.contextTime + (eventTimeStamp - ts.performanceTime) / 1000,
        );
      }
    }
    const taps = this.tapsSched.length;
    this.update({
      calibrating: {
        label: this.calLabel,
        taps,
        target: CALIBRATION_TAPS,
      },
    });
    if (taps >= CALIBRATION_TAPS) this.finishCalibration();
  }

  private finishCalibration(): void {
    this.stopLoop();
    this.stopAllNodes();
    const offsets = tapOffsetsMs(this.tapsSched, this.accentsCtx);
    const outOffsets = tapOffsetsMs(this.tapsOutput, this.accentsCtx);
    const { baseLatencyMs, outputLatencyMs } = this.snap.latency;
    const round1 = (v: number) => Math.round(v * 10) / 10;
    const run: CalibrationRun = {
      label: this.calLabel,
      taps: offsets.length,
      meanMs: round1(mean(offsets)),
      sdMs: round1(stdDev(offsets)),
      meanOutputMs: outOffsets.length ? round1(mean(outOffsets)) : null,
      sdOutputMs: outOffsets.length > 1 ? round1(stdDev(outOffsets)) : null,
      reportedLatencyMs:
        baseLatencyMs === null && outputLatencyMs === null
          ? null
          : round1((baseLatencyMs ?? 0) + (outputLatencyMs ?? 0)),
      offsetsMs: offsets.map(round1),
    };
    const ok = offsets.length >= 4 && Number.isFinite(run.meanMs);
    this.update({
      state: "ready",
      calibrating: null,
      calibrations: [...this.snap.calibrations, run],
      latencyOffsetMs: ok ? Math.round(run.meanMs) : this.snap.latencyOffsetMs,
    });
    this.log(
      "calibración terminada",
      ok
        ? `${run.label}: ${run.meanMs} ± ${run.sdMs} ms (${run.taps} toques)`
        : `${run.label}: pocos toques (${offsets.length}), no se aplica`,
    );
  }

  // --- Ajustes ----------------------------------------------------------------------------

  setApplyOffsetToClips(apply: boolean): void {
    if (this.isSessionActive()) return;
    this.update({ applyOffsetToClips: apply });
  }

  setLatencyOffset(ms: number): void {
    if (this.isSessionActive() || !Number.isFinite(ms)) return;
    this.update({ latencyOffsetMs: Math.round(ms) });
  }

  setParams(params: SchedulerParams): void {
    if (this.isSessionActive()) return;
    this.update({ params });
  }

  // --- Wake Lock --------------------------------------------------------------------------

  private async requestWakeLock(): Promise<void> {
    if (!("wakeLock" in navigator)) {
      this.update({
        wakeLock: { ...this.snap.wakeLock, status: "no soportado" },
      });
      return;
    }
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      this.wakeLock = sentinel;
      sentinel.addEventListener("release", () => {
        this.wakeLock = null;
        this.update({
          wakeLock: {
            ...this.snap.wakeLock,
            status: "liberado",
            releases: this.snap.wakeLock.releases + 1,
          },
        });
        this.log("wakelock", "liberado");
      });
      this.update({
        wakeLock: {
          ...this.snap.wakeLock,
          status: "activo",
          requests: this.snap.wakeLock.requests + 1,
        },
      });
      this.log("wakelock", "activo");
    } catch (e) {
      this.update({
        wakeLock: { ...this.snap.wakeLock, status: `error: ${errorText(e)}` },
      });
      this.log("wakelock-error", errorText(e));
    }
  }

  // --- Lectura para la UI -----------------------------------------------------------------

  /** Latencia con que se pinta la cuenta: la calibrada si hay; si no, la que reporta el navegador. */
  private displayLatencyMs(): number {
    if (this.snap.calibrations.length > 0) return this.snap.latencyOffsetMs;
    const { baseLatencyMs, outputLatencyMs } = this.snap.latency;
    return (baseLatencyMs ?? 0) + (outputLatencyMs ?? 0);
  }

  /** Lo que se oye ahora, leído del reloj de audio (se llama desde requestAnimationFrame). */
  currentView(): CurrentView {
    const ctx = this.ctx;
    const state = this.snap.state;
    if (!ctx || this.anchors.length < 2) {
      return { beat: null, beatInPhrase: null, step: null };
    }
    const running = state === "playing" || state === "calibrating";
    if (!running && state !== "paused" && state !== "interrupted") {
      return { beat: null, beatInPhrase: null, step: null };
    }
    // En pausa se congela en lo último que se oyó: misma resta de latencia que sonando.
    const posMs =
      (running
        ? trackPositionMs(ctx.currentTime, this.trackStartCtx)
        : this.snap.positionMs) - this.displayLatencyMs();
    if (posMs < 0) return { beat: null, beatInPhrase: null, step: null };
    const beat = Math.floor(msToBeat(this.anchors, posMs) + 1e-6);
    const item = this.snap.plan.find(
      (p) =>
        beat >= p.startPhrase * 8 && beat < (p.startPhrase + p.phrases) * 8,
    );
    return {
      beat,
      beatInPhrase: (((beat % 8) + 8) % 8) + 1,
      step: item ? item.slug : beat < 0 ? "entrada" : null,
    };
  }

  /** Todo lo medido, para "Copiar resultados". */
  results(): Record<string, unknown> {
    const ctx = this.ctx;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const s = this.snap;
    return {
      spike: "melao/audio",
      version: 1,
      at: new Date().toISOString(),
      env: {
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext,
        wakeLockSupported: "wakeLock" in navigator,
        getOutputTimestamp: ctx
          ? typeof ctx.getOutputTimestamp === "function"
          : null,
        sampleRate: ctx?.sampleRate ?? null,
        deviceMemoryGB: nav.deviceMemory ?? null,
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      },
      state: s.state,
      ctxState: s.ctxState,
      source: s.source,
      memory: s.memory,
      heapNowBytes: heapBytes(),
      timeline: { events: s.eventCount, steps: s.plan.length },
      scheduler: s.params,
      latencyOffsetMs: s.latencyOffsetMs,
      applyOffsetToClips: s.applyOffsetToClips,
      drift: s.drift,
      clock: s.clock,
      latency: s.latency,
      calibrations: s.calibrations,
      wakeLock: s.wakeLock,
      recovered: s.recovered,
      error: s.error,
      log: s.log,
    };
  }
}
