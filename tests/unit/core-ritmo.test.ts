import { describe, expect, test } from "bun:test";
import {
  assertAnchors,
  beatInPhrase,
  beatToMs,
  constantGrid,
  msToBeat,
} from "@/supabase/functions/_shared/core/grid.ts";
import {
  availablePhrases,
  entryShiftPhrases,
  phraseWindow,
} from "@/supabase/functions/_shared/core/phrases.ts";
import {
  assertStyle,
  MERENGUE,
  SALSA_CASINO,
  type StyleConfig,
} from "@/supabase/functions/_shared/core/style.ts";
import {
  assertPlan,
  buildTimeline,
  type PlanItem,
  roundMs,
} from "@/supabase/functions/_shared/core/timeline.ts";

describe("rejilla (motor-de-ritmo §2)", () => {
  test("anclas inválidas", () => {
    expect(() => assertAnchors([])).toThrow();
    expect(() => assertAnchors([{ beat: 0, tMs: 0 }])).toThrow();
    // Desordenadas, beat repetido, tiempo que no avanza.
    expect(() =>
      assertAnchors([
        { beat: 2, tMs: 0 },
        { beat: 1, tMs: 10 },
      ]),
    ).toThrow();
    expect(() =>
      assertAnchors([
        { beat: 1, tMs: 0 },
        { beat: 1, tMs: 10 },
      ]),
    ).toThrow();
    expect(() =>
      assertAnchors([
        { beat: 0, tMs: 10 },
        { beat: 1, tMs: 10 },
      ]),
    ).toThrow();
    // Beat fraccionario o tMs no finito.
    expect(() =>
      assertAnchors([
        { beat: 0.5, tMs: 0 },
        { beat: 1, tMs: 10 },
      ]),
    ).toThrow();
    expect(() =>
      assertAnchors([
        { beat: 0, tMs: 0 },
        { beat: 1, tMs: Number.NaN },
      ]),
    ).toThrow();
    expect(() => beatToMs([{ beat: 0, tMs: 0 }], 1)).toThrow();
    expect(() => msToBeat([{ beat: 0, tMs: 0 }], 1)).toThrow();
  });

  test("BPM inválido", () => {
    expect(() => constantGrid(0, 0)).toThrow();
    expect(() => constantGrid(-120, 0)).toThrow();
    expect(() => constantGrid(Number.POSITIVE_INFINITY, 0)).toThrow();
  });

  test("en un ancla intermedia vale el tiempo del ancla y cambia de segmento", () => {
    const g = [
      { beat: 0, tMs: 0 },
      { beat: 8, tMs: 4000 },
      { beat: 16, tMs: 7200 },
    ];
    expect(beatToMs(g, 8)).toBe(4000);
    expect(beatToMs(g, 9)).toBe(4400);
    expect(msToBeat(g, 4000)).toBe(8);
    expect(msToBeat(g, 7600)).toBe(17);
  });

  test("tiempo en la frase: módulo positivo en la entrada y otros tamaños de frase", () => {
    expect(beatInPhrase(-8, 8)).toBe(1);
    expect(beatInPhrase(-1, 8)).toBe(8);
    expect(beatInPhrase(-9, 8)).toBe(8);
    expect(beatInPhrase(-16, 8)).toBe(1);
    expect(beatInPhrase(5, 4)).toBe(2);
    expect(beatInPhrase(-1, 4)).toBe(4);
  });
});

describe("estilo (§1)", () => {
  test("salsa casino y merengue son válidos", () => {
    expect(() => assertStyle(SALSA_CASINO)).not.toThrow();
    expect(() => assertStyle(MERENGUE)).not.toThrow();
  });

  test("mismas reglas que dance_styles", () => {
    const bad: Partial<StyleConfig>[] = [
      { beatsPerPhrase: 1 },
      { beatsPerPhrase: 17 },
      { spokenBeats: [] },
      { spokenBeats: [0, 1] },
      { spokenBeats: [1, 9] },
      { spokenBeats: [1, 1] },
      { callBeat: 0 },
      { callBeat: 8 }, // 8 + 2 − 1 > 8: el anuncio no cabe
      { callSpanBeats: 0 },
      { callSpanBeats: 5 },
      { leadInPhrases: -1 },
      { leadInPhrases: 5 },
      { leadInPhrases: 1.5 },
    ];
    for (const patch of bad) {
      expect(() => assertStyle({ ...SALSA_CASINO, ...patch })).toThrow();
    }
  });
});

describe("frases disponibles (§3)", () => {
  test("danceEndMs no finito", () => {
    const g = constantGrid(120, 4000);
    expect(() => availablePhrases(g, Number.POSITIVE_INFINITY, 8)).toThrow();
    expect(() => availablePhrases(g, Number.NaN, 8)).toThrow();
  });

  test("si ni el beat 0 cae dentro del audio, se desplaza lo necesario", () => {
    // t(0) = -1000, t(8) = 3000: la frase 1 es la primera cuya entrada cabe.
    const g = [
      { beat: 4, tMs: 1000 },
      { beat: 5, tMs: 1500 },
    ];
    expect(entryShiftPhrases(g, SALSA_CASINO)).toBe(2);
  });

  test("sin frase de entrada (leadInPhrases 0) no hay desplazamiento", () => {
    const style = { ...SALSA_CASINO, leadInPhrases: 0 };
    expect(entryShiftPhrases(constantGrid(120, 0), style)).toBe(0);
    expect(phraseWindow(style, constantGrid(120, 0), 8000)).toEqual({
      startPhrase: 0,
      phrases: 2,
    });
  });

  test("la ventana nunca es negativa", () => {
    expect(phraseWindow(SALSA_CASINO, constantGrid(120, 1000), 2000)).toEqual({
      startPhrase: 1,
      phrases: 0,
    });
  });
});

describe("línea de tiempo (§5)", () => {
  const grid = constantGrid(120, 4000);
  const base: PlanItem = {
    stepId: "b",
    slug: "base",
    startPhrase: 0,
    phrases: 1,
  };

  test("redondeo de tMs: mitad hacia arriba", () => {
    expect(roundMs(812.5)).toBe(813);
    expect(roundMs(812.4999)).toBe(812);
    expect(roundMs(-0.5)).toBe(0);
    expect(roundMs(-1.5)).toBe(-1);
  });

  test("plan inválido", () => {
    expect(() => assertPlan([{ ...base, phrases: 0 }])).toThrow();
    expect(() => assertPlan([{ ...base, startPhrase: -1 }])).toThrow();
    expect(() => assertPlan([{ ...base, phrases: 1.5 }])).toThrow();
    expect(() =>
      assertPlan([base, { ...base, stepId: "e", startPhrase: 2 }]),
    ).toThrow();
    expect(() =>
      buildTimeline(SALSA_CASINO, grid, [base, { ...base, startPhrase: 0 }]),
    ).toThrow();
    expect(() =>
      buildTimeline({ ...SALSA_CASINO, callBeat: 8 }, grid, [base]),
    ).toThrow();
  });

  test("plan vacío → sin eventos", () => {
    expect(buildTimeline(SALSA_CASINO, grid, [])).toEqual([]);
  });

  test("sin frase de entrada no se anuncia el primer paso", () => {
    const events = buildTimeline({ ...SALSA_CASINO, leadInPhrases: 0 }, grid, [
      base,
    ]);
    expect(events.some((e) => e.kind === "call")).toBe(false);
    expect(events[0]).toMatchObject({ kind: "stepStart", beat: 0 });
  });

  test("dos frases de entrada: solo la última anuncia", () => {
    const events = buildTimeline(
      { ...SALSA_CASINO, leadInPhrases: 2 },
      constantGrid(120, 8000),
      [base],
    );
    const calls = events.filter((e) => e.kind === "call");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ beat: -4, clip: "step.base" });
    expect(events[0]).toMatchObject({ beat: -16, clip: "count.1" });
  });

  test("callBeat fuera de los tiempos hablados: silencia los que caen en su tramo", () => {
    const style: StyleConfig = {
      ...SALSA_CASINO,
      spokenBeats: [1, 3, 5, 7],
      callBeat: 4,
    };
    const next: PlanItem = { ...base, stepId: "e", slug: "e", startPhrase: 1 };
    const p0 = buildTimeline(style, grid, [base, next]).filter(
      (e) => e.beat >= 0 && e.beat < 8,
    );
    expect(p0.map((e) => e.clip)).toEqual([
      null,
      "count.1",
      "count.3",
      "step.e",
      "count.7",
    ]);
  });

  test("tMs no compensa latencia ni depende del reproductor", () => {
    const events = buildTimeline(SALSA_CASINO, grid, [base]);
    expect(events.find((e) => e.kind === "stepStart")?.tMs).toBe(4000);
    expect(events.every((e) => Number.isInteger(e.tMs))).toBe(true);
  });

  test("el `end` no pasa de danceEndMs cuando el plan cubre la ventana", () => {
    const anchors = [
      { beat: 0, tMs: 3100 },
      { beat: 8, tMs: 6900 },
      { beat: 16, tMs: 10400 },
    ];
    const danceEndMs = 30000;
    const { startPhrase, phrases } = phraseWindow(
      SALSA_CASINO,
      anchors,
      danceEndMs,
    );
    const plan: PlanItem[] = Array.from({ length: phrases }, (_, i) => ({
      ...base,
      stepId: `s${i % 2}`,
      startPhrase: startPhrase + i,
    }));
    const events = buildTimeline(SALSA_CASINO, anchors, plan);
    expect(events.at(-1)?.kind).toBe("end");
    expect(events.at(-1)?.tMs).toBeLessThanOrEqual(danceEndMs);
    expect(events[0].tMs).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].tMs).toBeGreaterThanOrEqual(events[i - 1].tMs);
    }
  });
});
