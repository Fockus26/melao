import { describe, expect, test } from "bun:test";
import {
  beatInPhrase,
  beatToMs,
  constantGrid,
  msToBeat,
} from "@/lib/audio/grid";
import {
  availablePhrases,
  buildSpikePlan,
  buildSpikeSession,
  buildTimeline,
  entryShiftPhrases,
  type PlanItem,
  SALSA_CASINO,
} from "@/lib/audio/timeline";

describe("rejilla por anclas", () => {
  test("BPM constante + offset: beat → ms", () => {
    const g = constantGrid(120, 1000); // 500 ms por tiempo
    expect(beatToMs(g, 0)).toBe(1000);
    expect(beatToMs(g, 8)).toBe(5000);
    expect(beatToMs(g, -8)).toBe(-3000); // extrapola la entrada
    expect(beatToMs(g, 2.5)).toBe(2250);
  });

  test("msToBeat es la inversa", () => {
    const g = constantGrid(187, 733);
    for (const b of [-8, -1, 0, 3.25, 100]) {
      expect(msToBeat(g, beatToMs(g, b))).toBeCloseTo(b, 9);
    }
  });

  test("varias anclas: interpola por segmento y extrapola con el más cercano", () => {
    const g = [
      { beat: 0, tMs: 0 },
      { beat: 4, tMs: 2000 },
      { beat: 8, tMs: 3600 },
    ];
    expect(beatToMs(g, 2)).toBe(1000);
    expect(beatToMs(g, 6)).toBe(2800);
    expect(beatToMs(g, 10)).toBe(4400);
    expect(beatToMs(g, -2)).toBe(-1000);
  });

  test("anclas inválidas", () => {
    expect(() => beatToMs([{ beat: 0, tMs: 0 }], 1)).toThrow();
    expect(() =>
      beatToMs(
        [
          { beat: 2, tMs: 0 },
          { beat: 1, tMs: 10 },
        ],
        1,
      ),
    ).toThrow();
  });

  test("tiempo en la frase, también en la entrada", () => {
    expect(beatInPhrase(0, 8)).toBe(1);
    expect(beatInPhrase(12, 8)).toBe(5);
    expect(beatInPhrase(-8, 8)).toBe(1);
    expect(beatInPhrase(-1, 8)).toBe(8);
  });
});

describe("línea de tiempo (motor-de-ritmo §5)", () => {
  const grid = constantGrid(120, 5000); // entrada (-8…-1) = 1000…4500 ms

  const plan: PlanItem[] = [
    { stepId: "base", slug: "base", startPhrase: 0, phrases: 2 },
    { stepId: "enchufla", slug: "enchufla", startPhrase: 2, phrases: 1 },
    { stepId: "enchufla", slug: "enchufla", startPhrase: 3, phrases: 1 },
  ];
  const events = buildTimeline(SALSA_CASINO, grid, plan);
  const inPhrase = (p: number) =>
    events.filter((e) => e.beat >= p * 8 && e.beat < (p + 1) * 8);

  test("la entrada anuncia el primer paso en el 5 y silencia el 5–6", () => {
    const entry = inPhrase(-1);
    expect(entry.filter((e) => e.kind === "count").map((e) => e.clip)).toEqual([
      "count.1",
      "count.2",
      "count.3",
      "count.7",
    ]);
    const call = entry.find((e) => e.kind === "call");
    expect(call).toMatchObject({
      beat: -4,
      beatInPhrase: 5,
      clip: "step.base",
      tMs: 3000,
    });
  });

  test("frase intermedia: cuenta de salsa sin 4 ni 8, sin anuncio", () => {
    const p0 = inPhrase(0);
    expect(p0.filter((e) => e.kind === "call")).toHaveLength(0);
    expect(
      p0.filter((e) => e.kind === "count").map((e) => e.beatInPhrase),
    ).toEqual([1, 2, 3, 5, 6, 7]);
    expect(p0[0]).toMatchObject({
      kind: "stepStart",
      stepId: "base",
      tMs: 5000,
    });
  });

  test("última frase de un paso anuncia el siguiente si es distinto", () => {
    const p1 = inPhrase(1);
    expect(p1.find((e) => e.kind === "call")?.clip).toBe("step.enchufla");
    expect(p1.some((e) => e.clip === "count.5" || e.clip === "count.6")).toBe(
      false,
    );
    expect(p1.some((e) => e.clip === "count.7")).toBe(true);
  });

  test("paso repetido: no hay anuncio y la cuenta sigue", () => {
    const p2 = inPhrase(2);
    expect(p2.some((e) => e.kind === "call")).toBe(false);
    expect(p2.filter((e) => e.kind === "count")).toHaveLength(6);
  });

  test("termina con `end` al final de la última frase y va ordenada", () => {
    const last = events.at(-1);
    expect(last).toMatchObject({ kind: "end", beat: 32, clip: null });
    for (let i = 1; i < events.length; i++) {
      expect(events[i].tMs).toBeGreaterThanOrEqual(events[i - 1].tMs);
    }
  });
});

describe("plan del spike", () => {
  test("frases disponibles: t(8·(p+1)) ≤ danceEndMs", () => {
    const g = constantGrid(120, 0); // una frase = 4000 ms
    expect(availablePhrases(g, 8000, 8)).toBe(2);
    expect(availablePhrases(g, 7999, 8)).toBe(1);
  });

  test("si la entrada no cabe antes del 0, la frase 0 hace de entrada", () => {
    expect(entryShiftPhrases(constantGrid(120, 1000), SALSA_CASINO)).toBe(1);
    expect(entryShiftPhrases(constantGrid(120, 4000), SALSA_CASINO)).toBe(0);
    const { plan, events } = buildSpikeSession(
      SALSA_CASINO,
      constantGrid(120, 1000),
      60000,
    );
    expect(plan[0].startPhrase).toBe(1);
    expect(events[0].tMs).toBeGreaterThanOrEqual(0);
  });

  test("el plan es contiguo y cubre exactamente las frases pedidas", () => {
    const plan = buildSpikePlan(1, 17);
    expect(plan[0].startPhrase).toBe(1);
    let next = 1;
    for (const p of plan) {
      expect(p.startPhrase).toBe(next);
      next += p.phrases;
    }
    expect(next).toBe(18);
    // Incluye un paso repetido (sin anuncio) y cambios (con anuncio).
    expect(plan.some((p, i) => i > 0 && plan[i - 1].stepId === p.stepId)).toBe(
      true,
    );
  });
});
