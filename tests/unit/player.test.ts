/**
 * Reproductor real (`lib/player`) con un `AudioContext` falso y el bucle a mano: qué se programa
 * en cada ventana (D030), pausa y reanudar sin saltos, latencia solo en la vista (D032), voz,
 * fin, pestaña oculta, interrupción y Wake Lock. Y los golpes de la pista sintética (D121).
 */

import { describe, expect, test } from "bun:test";
import {
  createAudioStageSource,
  RESUME_DELAY_S,
  reportedLatencyMs,
  START_DELAY_S,
  type WakeLockLike,
} from "@/lib/player/player";
import {
  createSyntheticTrack,
  firstHitFrom,
  syntheticHits,
} from "@/lib/player/synthetic-track";
import { fakeSession } from "@/lib/stage/fake-source";
import { constantGrid } from "@/supabase/functions/_shared/core/grid.ts";

// --- AudioContext falso ---------------------------------------------------------------------

class FakeParam {
  value = 0;
  sets: [number, number][] = [];
  setValueAtTime(v: number, t: number) {
    this.value = v;
    this.sets.push([v, t]);
    return this;
  }
  exponentialRampToValueAtTime() {
    return this;
  }
}

class FakeNode {
  connect<T>(node: T): T {
    return node;
  }
  disconnect() {}
}

class FakeSource extends FakeNode {
  buffer: unknown = null;
  type = "";
  frequency = new FakeParam();
  onended: (() => void) | null = null;
  when: number | null = null;
  stopped = false;
  constructor(readonly kind: "osc" | "buffer") {
    super();
  }
  start(when = 0) {
    this.when = when;
  }
  stop(at?: number) {
    if (at === undefined) this.stopped = true;
  }
}

class FakeContext {
  currentTime = 0;
  state: "suspended" | "running" | "closed" | "interrupted" = "suspended";
  baseLatency = 0.01;
  outputLatency = 0.03;
  sampleRate = 44100;
  destination = new FakeNode();
  onstatechange: (() => void) | null = null;
  sources: FakeSource[] = [];
  gains: { gain: FakeParam }[] = [];
  resume() {
    this.setState("running");
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
  setState(state: FakeContext["state"]) {
    this.state = state;
    this.onstatechange?.();
  }
  createGain() {
    const g = Object.assign(new FakeNode(), { gain: new FakeParam() });
    this.gains.push(g);
    return g;
  }
  createOscillator() {
    const s = new FakeSource("osc");
    this.sources.push(s);
    return s;
  }
  createBufferSource() {
    const s = new FakeSource("buffer");
    this.sources.push(s);
    return s;
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), {
      type: "",
      frequency: new FakeParam(),
    });
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = new Float32Array(length);
    return {
      length,
      numberOfChannels: channels,
      duration: length / sampleRate,
      getChannelData: () => data,
    };
  }
  /** Clips de voz programados (la pista son osciladores). */
  voice() {
    return this.sources.filter((s) => s.kind === "buffer" && s.when !== null);
  }
}

// --- Montaje --------------------------------------------------------------------------------

const BPM = 184;
const session = fakeSession(undefined, BPM);
const { events, durationMs } = session.timeline;
const START_MS = 0;

function setup(
  opts: {
    latencyOffsetMs?: number | null;
    wake?: () => Promise<WakeLockLike | null>;
  } = {},
) {
  const ctx = new FakeContext();
  let interval: (() => void) | null = null;
  let frame: (() => void) | null = null;
  let hidden: (() => void) | null = null;
  const released: number[] = [];
  const source = createAudioStageSource({
    session,
    startMs: START_MS,
    bpm: BPM,
    track: createSyntheticTrack({
      anchors: session.timeline.anchors,
      beatsPerPhrase: 8,
      durationMs,
    }),
    latencyOffsetMs:
      opts.latencyOffsetMs === undefined ? 0 : opts.latencyOffsetMs,
    deps: {
      createContext: () => ctx as unknown as AudioContext,
      setInterval: (fn) => {
        interval = fn;
        return 1;
      },
      clearInterval: () => {
        interval = null;
      },
      requestFrame: (fn) => {
        frame = fn;
        return 1;
      },
      cancelFrame: () => {
        frame = null;
      },
      requestWakeLock:
        opts.wake ??
        (() =>
          Promise.resolve({
            release: () => {
              released.push(ctx.currentTime);
              return Promise.resolve();
            },
            addEventListener: () => {},
          })),
      onHidden: (fn) => {
        hidden = fn;
        return () => {
          hidden = null;
        };
      },
    },
  });
  /** Avanza el reloj de audio en pasos de 25 ms, con una vuelta del bucle en cada uno. */
  const advance = (toS: number) => {
    while (ctx.currentTime < toS - 1e-9) {
      ctx.currentTime = Math.min(toS, ctx.currentTime + 0.025);
      interval?.();
    }
  };
  const runFrame = () => {
    const f = frame;
    frame = null;
    f?.();
  };
  return {
    ctx,
    source,
    advance,
    runFrame,
    hide: () => hidden?.(),
    released,
    looping: () => interval !== null,
  };
}

async function started(opts?: Parameters<typeof setup>[0]) {
  const t = setup(opts);
  t.source.subscribe(() => {});
  await t.source.prepare();
  t.source.play();
  await Promise.resolve();
  return t;
}

const voiceEvents = events.filter((e) => e.clip !== null);

// --- Tests ----------------------------------------------------------------------------------

describe("ciclo", () => {
  test("preparando → bloqueado → sonando; el contexto se crea en el toque", async () => {
    const t = setup();
    expect(t.source.getSnapshot().status).toEqual({
      kind: "preparing",
      progress: 0,
    });
    await t.source.prepare();
    expect(t.source.getSnapshot().status.kind).toBe("blocked");
    expect(t.ctx.gains).toHaveLength(0);
    t.source.play();
    expect(t.source.getSnapshot().status.kind).toBe("playing");
    expect(t.ctx.state).toBe("running");
    expect(t.looping()).toBe(true);
  });

  test("el comando play antes de preparar no hace nada", () => {
    const t = setup();
    t.source.play();
    expect(t.source.getSnapshot().status.kind).toBe("preparing");
  });
});

describe("programación en ventana (D030)", () => {
  test("la primera vuelta solo programa lo que cae en 200 ms", async () => {
    const t = await started();
    const anchor = START_DELAY_S - START_MS / 1000;
    // Pista: golpes hasta 200 ms de pista desde la posición del reloj (que va 150 ms detrás).
    const toMs = (0 - anchor) * 1000 + 200;
    expect(t.ctx.voice().length).toBe(
      voiceEvents.filter((e) => e.tMs < toMs).length,
    );
  });

  test("en 10 s cada clip se programa una vez, en anchor + tMs, sin llegar tarde", async () => {
    const t = await started();
    const anchor = START_DELAY_S - START_MS / 1000;
    t.advance(10);
    const voice = t.ctx.voice();
    const expected = voiceEvents.filter(
      (e) => e.tMs < (10 - anchor) * 1000 + 200,
    );
    expect(voice).toHaveLength(expected.length);
    voice.forEach((node, i) => {
      expect(node.when).toBeCloseTo(anchor + expected[i].tMs / 1000, 9);
    });
  });

  test("la vista sigue al reloj de audio: a 10 s está en el tiempo que toca", async () => {
    const t = await started();
    t.advance(10);
    t.runFrame();
    const pos = (10 - START_DELAY_S) * 1000 + START_MS;
    const view = t.source.getSnapshot().view;
    expect(view.positionMs).toBeCloseTo(pos, 6);
    const beatMs = 60000 / BPM;
    const first = session.timeline.anchors[0];
    expect(view.beat).toBe(Math.floor((pos - first.tMs) / beatMs + 1e-9));
  });

  test("la cuenta avanza al BPM: un tiempo por cada 60/BPM s", async () => {
    const t = await started();
    const beats: number[] = [];
    for (let s = 2; s <= 12; s += 60 / BPM) {
      t.advance(s);
      t.runFrame();
      const b = t.source.getSnapshot().view.beat;
      if (b !== null) beats.push(b);
    }
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i] - beats[i - 1]).toBe(1);
    }
    expect(beats.length).toBeGreaterThan(25);
  });
});

describe("pausa y reanudar sin saltos", () => {
  test("reanuda en la misma posición y reprograma desde ahí", async () => {
    const t = await started();
    t.advance(5);
    t.source.pause();
    const held = t.source.getSnapshot().view.positionMs;
    expect(held).toBeCloseTo((5 - START_DELAY_S) * 1000, 6);
    expect(t.looping()).toBe(false);
    expect(t.ctx.voice().every((n) => n.stopped)).toBe(true);
    const before = t.ctx.voice().length;

    t.ctx.currentTime = 8; // En pausa el reloj sigue corriendo.
    t.source.play();
    // Durante el margen de reanudar la vista no retrocede.
    expect(t.source.getSnapshot().view.positionMs).toBeCloseTo(held, 6);
    const anchor = 8 + RESUME_DELAY_S - held / 1000;
    t.advance(10);
    const after = t.ctx.voice().slice(before);
    const expected = voiceEvents.filter(
      (e) => e.tMs >= held && e.tMs < (10 - anchor) * 1000 + 200,
    );
    expect(after).toHaveLength(expected.length);
    after.forEach((node, i) => {
      expect(node.when).toBeCloseTo(anchor + expected[i].tMs / 1000, 9);
    });
  });

  test("pestaña oculta → pausa", async () => {
    const t = await started();
    t.advance(2);
    t.hide();
    expect(t.source.getSnapshot().status.kind).toBe("playing");
    const detach = t.source.attach();
    t.hide();
    expect(t.source.getSnapshot().status.kind).toBe("paused");
    detach();
  });

  test("contexto interrumpido (llamada, iOS) → pausa en la posición congelada", async () => {
    const t = await started();
    t.advance(3);
    t.ctx.setState("interrupted");
    expect(t.source.getSnapshot().status.kind).toBe("paused");
    expect(t.source.getSnapshot().view.positionMs).toBeCloseTo(
      (3 - START_DELAY_S) * 1000,
      6,
    );
  });
});

describe("latencia (D032)", () => {
  test("la calibración mueve la vista, no los clips", async () => {
    const t = await started({ latencyOffsetMs: 120 });
    t.advance(4);
    t.runFrame();
    expect(t.source.getSnapshot().view.positionMs).toBeCloseTo(
      (4 - START_DELAY_S) * 1000 - 120,
      6,
    );
    const anchor = START_DELAY_S;
    const first = t.ctx.voice()[0];
    expect(first.when).toBeCloseTo(anchor + voiceEvents[0].tMs / 1000, 9);
  });

  test("sin calibración, la que reporta el navegador", async () => {
    const t = await started({ latencyOffsetMs: null });
    t.advance(4);
    t.runFrame();
    expect(reportedLatencyMs(t.ctx as unknown as AudioContext)).toBeCloseTo(
      40,
      9,
    );
    expect(t.source.getSnapshot().view.positionMs).toBeCloseTo(
      (4 - START_DELAY_S) * 1000 - 40,
      6,
    );
  });
});

describe("voz, fin y Wake Lock", () => {
  test("Voz apaga la ganancia de la voz al instante", async () => {
    const t = await started();
    t.advance(1);
    t.source.setVoice(false);
    const voiceGain = t.ctx.gains[1].gain;
    expect(voiceGain.value).toBe(0);
    expect(voiceGain.sets.at(-1)).toEqual([0, 1]);
    expect(t.source.getSnapshot().voice).toBe(false);
  });

  test("al terminar la pista: terminado, suelta el Wake Lock; Reiniciar vuelve a sonar", async () => {
    const t = await started();
    t.advance(durationMs / 1000 + 1);
    expect(t.source.getSnapshot().status.kind).toBe("ended");
    expect(t.released).toHaveLength(1);
    t.source.restart();
    expect(t.source.getSnapshot().status.kind).toBe("playing");
    expect(t.source.getSnapshot().view.positionMs).toBe(START_MS);
  });

  test("sin Wake Lock: aviso de pantalla", async () => {
    const t = await started({ wake: () => Promise.resolve(null) });
    await Promise.resolve();
    expect(t.source.getSnapshot().screenMayTurnOff).toBe(true);
  });

  test("al desmontar cierra el contexto y vuelve a preparar si se monta otra vez", async () => {
    const t = await started();
    const detach = t.source.attach();
    t.advance(2);
    detach();
    expect(t.ctx.state).toBe("closed");
    expect(t.source.getSnapshot().status.kind).toBe("preparing");
    await t.source.prepare();
    expect(t.source.getSnapshot().status.kind).toBe("blocked");
  });
});

describe("pista sintética (D121)", () => {
  const anchors = constantGrid(120, 1000);

  test("un golpe por tiempo, también antes del primer 1; acento en el 1 y en el 5", () => {
    const hits = syntheticHits(anchors, 8, 5000);
    expect(hits.map((h) => h.tMs)).toEqual([
      0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500,
    ]);
    expect(hits[2].kind).toBe("one");
    expect(hits[0].kind).toBe("beat"); // beat −2: el 7 de la frase anterior.
    expect(hits[1].kind).toBe("beat");
    expect(hits[6].kind).toBe("middle");
  });

  test("solo programa la ventana pedida, sin repetir golpes", async () => {
    const ctx = new FakeContext();
    const track = createSyntheticTrack({
      anchors,
      beatsPerPhrase: 8,
      durationMs: 5000,
    });
    await track.prepare(() => {});
    track.start(
      ctx as unknown as BaseAudioContext,
      new FakeNode() as unknown as AudioNode,
      10,
      10,
    );
    track.pump(0, 1200);
    track.pump(0, 1200);
    const starts = () => [...new Set(ctx.sources.map((s) => s.when))];
    expect(starts()).toEqual([10, 10.5, 11]);
    track.pump(1200, 1600);
    expect(starts()).toEqual([10, 10.5, 11, 11.5]);
    track.stop();
    expect(ctx.sources.every((s) => s.stopped)).toBe(true);
  });

  test("reanudar a mitad: empieza en el primer golpe que no pasó", () => {
    const hits = syntheticHits(anchors, 8, 5000);
    expect(firstHitFrom(hits, 1200)).toBe(3);
    expect(firstHitFrom(hits, 9000)).toBe(hits.length);
  });
});
