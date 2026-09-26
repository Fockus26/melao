import { describe, expect, test } from "bun:test";
import { constantGrid } from "@/lib/audio/grid";
import {
  ctxTimeFor,
  eventsToSchedule,
  lookaheadWindow,
  programmedMs,
  resumeAnchor,
  resumeCursor,
  trackPositionMs,
  trackStartArgs,
} from "@/lib/audio/scheduling";
import { clockDrift, mean, stdDev, tapOffsetsMs } from "@/lib/audio/stats";
import { buildSpikeSession, SALSA_CASINO } from "@/lib/audio/timeline";

const { events } = buildSpikeSession(
  SALSA_CASINO,
  constantGrid(180, 3167),
  240000,
);

describe("latencyOffsetMs", () => {
  test("tProgramado = tMs − latencyOffsetMs", () => {
    expect(programmedMs(1000, 0)).toBe(1000);
    expect(programmedMs(1000, 180)).toBe(820);
    expect(programmedMs(1000, -20)).toBe(1020);
  });

  test("instante del contexto a partir del ancla de la pista", () => {
    expect(ctxTimeFor(1000, 0, 10)).toBeCloseTo(11, 9);
    expect(ctxTimeFor(1000, 200, 10)).toBeCloseTo(10.8, 9);
  });
});

describe("ventana de lookahead", () => {
  test("cubre [posición actual, posición + lookahead)", () => {
    expect(lookaheadWindow(12.5, 10, 200)).toEqual({
      fromMs: 2500,
      toMs: 2700,
    });
    expect(lookaheadWindow(9.9, 10, 200).fromMs).toBeCloseTo(-100, 6);
  });

  test("programa cada evento una sola vez, en orden, al barrer la pista", () => {
    let cursor = 0;
    const seen: number[] = [];
    // Vueltas de 25 ms con 200 ms de lookahead sobre toda la pista.
    for (let now = 0; now < 250; now += 0.025) {
      const { toMs } = lookaheadWindow(now, 0, 200);
      const { batch, nextCursor } = eventsToSchedule(events, cursor, toMs, 0);
      for (const e of batch) {
        // Nunca se programa algo que ya debía haber sonado.
        expect(e.tMs).toBeGreaterThanOrEqual(now * 1000 - 1e-6);
        seen.push(e.tMs);
      }
      cursor = nextCursor;
    }
    expect(seen).toHaveLength(events.length);
    expect(seen).toEqual(events.map((e) => e.tMs));
  });

  test("con offset, los eventos entran antes en la ventana", () => {
    const first = events[0];
    const toMs = first.tMs - 100;
    expect(eventsToSchedule(events, 0, toMs, 0).batch).toHaveLength(0);
    expect(eventsToSchedule(events, 0, toMs, 150).batch.length).toBeGreaterThan(
      0,
    );
  });
});

describe("reanudar desde una posición arbitraria", () => {
  test("el cursor salta a lo que falta por sonar", () => {
    const pos = 61234;
    const i = resumeCursor(events, pos, 0);
    expect(events[i].tMs).toBeGreaterThanOrEqual(pos);
    expect(events[i - 1].tMs).toBeLessThan(pos);
    expect(resumeCursor(events, 0, 0)).toBe(0);
    expect(resumeCursor(events, 10_000_000, 0)).toBe(events.length);
  });

  test("tras reanudar, clips y pista siguen alineados (deriva 0)", () => {
    const pos = 61234;
    const now = 500.37; // el reloj siguió avanzando mientras estaba en pausa
    const anchor = resumeAnchor(now, pos, 0.1);
    const src = trackStartArgs(anchor, now + 0.1);
    expect(src.when).toBeCloseTo(now + 0.1, 9);
    expect(src.offsetS).toBeCloseTo(pos / 1000, 9);
    expect(trackPositionMs(now + 0.1, anchor)).toBeCloseTo(pos, 6);

    for (const offset of [0, 180]) {
      const i = resumeCursor(events, pos, offset);
      for (const e of events.slice(i, i + 20)) {
        const when = ctxTimeFor(e.tMs, offset, anchor);
        expect(when).toBeGreaterThanOrEqual(now + 0.1 - 1e-9);
        const trackPosS = src.offsetS + (when - src.when);
        expect(trackPosS * 1000 - programmedMs(e.tMs, offset)).toBeCloseTo(
          0,
          6,
        );
      }
    }
  });

  test("arranque: si el ancla es futura, la pista espera sin offset", () => {
    expect(trackStartArgs(5.15, 5)).toEqual({ when: 5.15, offsetS: 0 });
  });
});

describe("estadística", () => {
  test("media y desviación muestral", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(Number.isNaN(stdDev([1]))).toBe(true);
  });

  test("toques contra el acento más cercano", () => {
    const accents = [1, 2, 3, 4];
    expect(tapOffsetsMs([1.02, 2.95, 3.5001], accents).map(Math.round)).toEqual(
      [20, -50, -500],
    );
  });

  test("deriva del reloj de audio frente al de pared", () => {
    const d = clockDrift([
      { contextTime: 0, performanceTime: 1000 },
      { contextTime: 100.001, performanceTime: 101000 },
    ]);
    expect(d?.driftMs).toBeCloseTo(1, 6);
    expect(d?.ppm).toBeCloseTo(10, 3);
    expect(clockDrift([{ contextTime: 0, performanceTime: 0 }])).toBeNull();
  });
});
