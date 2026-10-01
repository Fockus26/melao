import { describe, expect, test } from "bun:test";
import {
  type CatalogStep,
  type ComboStep,
  generatePlan,
  isBaseStep,
  PlanError,
  type PlanInput,
  type PlanOrder,
  type StepWeightFactors,
  validateCatalog,
} from "@/supabase/functions/_shared/core/combinaciones.ts";
import {
  mulberry32,
  seedToUint32,
} from "@/supabase/functions/_shared/core/random.ts";
import {
  checkPlanInvariants,
  existsPlanWith,
} from "./core-combinaciones-invariants.ts";

/** Catálogo realista de salsa casino (rol líder): guapea, cerrada y abierta. */
const S = (
  id: string,
  category: CatalogStep["category"],
  from: string,
  to: string,
  phrases: number,
  o: Partial<Pick<ComboStep, "canStart" | "canEnd" | "repeatable">> = {},
): CatalogStep => ({
  id,
  category,
  startPosition: from,
  endPosition: to,
  phrases,
  canStart: o.canStart ?? false,
  canEnd: o.canEnd ?? true,
  repeatable: o.repeatable ?? false,
});

const CASINO: CatalogStep[] = [
  S("guapea", "base", "guapea", "guapea", 1, {
    canStart: true,
    repeatable: true,
  }),
  S("basico-cerrada", "base", "cerrada", "cerrada", 1, { repeatable: true }),
  S("dile-que-no", "entrada", "guapea", "cerrada", 1, { canStart: true }),
  S("vuelta-derecha", "vuelta", "guapea", "guapea", 1, { canStart: true }),
  S("exhibela", "figura", "guapea", "guapea", 2),
  S("enchufla", "salida", "cerrada", "guapea", 1),
  S("enchufla-doble", "salida", "cerrada", "guapea", 2),
  S("setenta", "figura", "cerrada", "guapea", 3),
  S("vacilala", "figura", "cerrada", "cerrada", 2),
  S("sombrero", "figura", "cerrada", "cerrada", 2),
  S("dame", "figura", "cerrada", "cerrada", 1, { repeatable: true }),
  S("el-uno", "figura", "cerrada", "cerrada", 1),
  S("abanico", "figura", "cerrada", "abierta", 1),
  S("paseala", "figura", "abierta", "abierta", 1, { canEnd: false }),
  S("cierre", "figura", "abierta", "cerrada", 1),
];
const BASE = CASINO.filter(isBaseStep);
const IDS = CASINO.map((s) => s.id);

describe("PRNG mulberry32", () => {
  test("valor de referencia y determinismo", () => {
    expect(mulberry32(0)()).toBe(0.26642920868471265);
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  test("la semilla se reduce a uint32", () => {
    expect(seedToUint32(2 ** 32 + 2)).toBe(2);
    expect(seedToUint32(-1)).toBe(2 ** 32 - 1);
    expect(seedToUint32(Number.MAX_SAFE_INTEGER)).toBe(2 ** 32 - 1);
    expect(() => seedToUint32(Number.NaN)).toThrow(RangeError);
  });
});

describe("generatePlan: casos límite", () => {
  const input: PlanInput = {
    phrases: 6,
    steps: CASINO,
    baseSteps: BASE,
    startPosition: "guapea",
    seed: 1,
  };

  test("startPhrase desplaza el plan sin cambiarlo", () => {
    const a = generatePlan(input);
    const b = generatePlan({ ...input, startPhrase: 1 });
    expect(b.plan.map((p) => p.stepId)).toEqual(a.plan.map((p) => p.stepId));
    expect(b.plan[0].startPhrase).toBe(1);
    checkPlanInvariants({ ...input, startPhrase: 1 }, b);
  });

  test("entrada inválida → PlanError invalid_input", () => {
    const bad = (i: PlanInput) => {
      try {
        generatePlan(i);
      } catch (e) {
        return (e as PlanError).code;
      }
      return null;
    };
    expect(bad({ ...input, phrases: -1 })).toBe("invalid_input");
    expect(bad({ ...input, phrases: 1.5 })).toBe("invalid_input");
    expect(bad({ ...input, steps: [{ ...CASINO[2], phrases: 0 }] })).toBe(
      "invalid_input",
    );
    // Un paso base debe empezar y terminar en la misma posición.
    expect(bad({ ...input, baseSteps: [CASINO[2]] })).toBe("invalid_input");
    // Criterio desconocido (otra plataforma que mande basura).
    expect(bad({ ...input, order: "nuevo" as PlanOrder })).toBe(
      "invalid_input",
    );
  });

  test("sin paso canStart en la posición inicial → no_plan, sin colgarse", () => {
    expect(() => generatePlan({ ...input, startPosition: "abierta" })).toThrow(
      PlanError,
    );
  });

  test("targets repetidos cuentan una vez", () => {
    const out = generatePlan({ ...input, targets: ["sombrero", "sombrero"] });
    expect(out.unplaced).toEqual([]);
    expect(out.plan.some((p) => p.stepId === "sombrero")).toBe(true);
  });
});

describe("generatePlan: propiedades sobre el catálogo de casino", () => {
  const meta = mulberry32(20260928);
  const int = (n: number) => Math.floor(meta() * n);
  const RUNS = 400;

  test(`${RUNS} entradas aleatorias cumplen todas las invariantes`, () => {
    let planes = 0;
    for (let run = 0; run < RUNS; run++) {
      // Filtros del alumno: un subconjunto aleatorio de pasos (a veces vacío).
      const steps = CASINO.filter(() => meta() < 0.7);
      const baseSteps = BASE.filter(() => meta() < 0.85);
      const targets = Array.from({ length: int(5) }, () =>
        meta() < 0.05 ? "paso-inexistente" : IDS[int(IDS.length)],
      );
      const weights: Record<string, StepWeightFactors> = {};
      for (const id of IDS) {
        if (meta() < 0.4) {
          weights[id] = {
            due: meta() < 0.5,
            difficulty: meta() < 0.5 ? 1 + meta() * 9 : undefined,
            favorite: meta() < 0.3,
            popularity: meta() < 0.5 ? meta() : undefined,
          };
        }
      }
      const input: PlanInput = {
        phrases: int(41),
        steps,
        baseSteps,
        startPosition: "guapea",
        targets,
        weights,
        seed: int(2 ** 32),
      };

      let out: ReturnType<typeof generatePlan>;
      try {
        out = generatePlan(input);
      } catch (e) {
        // Solo puede fallar si de verdad no existe ningún plan.
        expect(e).toBeInstanceOf(PlanError);
        expect((e as PlanError).code).toBe("no_plan");
        expect(existsPlanWith(input, null)).toBe(false);
        continue;
      }
      planes++;
      checkPlanInvariants(input, out);
      expect(generatePlan(input)).toEqual(out);

      // Un target que ningún plan puede contener va siempre a unplaced;
      // con un solo target, se coloca si y solo si es factible.
      const unique = [...new Set(targets)];
      for (const t of unique) {
        const feasible = existsPlanWith(input, t);
        if (!feasible) expect(out.unplaced).toContain(t);
        if (unique.length === 1)
          expect(out.unplaced.includes(t)).toBe(!feasible);
      }
    }
    // El muestreo tiene que ejercitar sobre todo planes válidos.
    expect(planes).toBeGreaterThan(RUNS * 0.6);
  });

  test("con catálogo completo y N ≥ 30, todo target factible se coloca", () => {
    for (let run = 0; run < 100; run++) {
      const targets = Array.from(
        { length: 1 + int(4) },
        () => IDS[int(IDS.length)],
      );
      const input: PlanInput = {
        phrases: 30 + int(11),
        steps: CASINO,
        baseSteps: BASE,
        startPosition: "guapea",
        targets,
        seed: int(2 ** 32),
      };
      const out = generatePlan(input);
      checkPlanInvariants(input, out);
      expect(out.unplaced).toEqual([]);
    }
  });

  test("la semilla cambia el plan", () => {
    const base = {
      phrases: 16,
      steps: CASINO,
      baseSteps: BASE,
      startPosition: "guapea",
    };
    const plans = new Set(
      Array.from({ length: 20 }, (_, seed) =>
        JSON.stringify(generatePlan({ ...base, seed }).plan),
      ),
    );
    expect(plans.size).toBeGreaterThan(10);
  });
});

describe("validateCatalog", () => {
  test("el catálogo de casino es válido", () => {
    expect(
      validateCatalog({
        positions: ["guapea", "cerrada", "abierta"],
        steps: CASINO,
        startPosition: "guapea",
      }),
    ).toEqual([]);
  });

  test("sin paso canStart en la posición inicial", () => {
    const steps = CASINO.map((s) => ({ ...s, canStart: false }));
    expect(
      validateCatalog({ positions: [], steps, startPosition: "guapea" }),
    ).toEqual([{ code: "no_start_step", position: "guapea" }]);
  });

  test("un catálogo válido siempre permite generar para N ≥ 1", () => {
    for (let n = 1; n <= 12; n++) {
      const input = {
        phrases: n,
        steps: CASINO,
        baseSteps: BASE,
        startPosition: "guapea",
        seed: n,
      };
      checkPlanInvariants(input, generatePlan(input));
    }
  });
});

describe("generatePlan: criterio (order, D115)", () => {
  const base = {
    phrases: 16,
    steps: CASINO,
    baseSteps: BASE,
    startPosition: "guapea",
  };
  const SEEDS = 300;
  /** Frases que ocupa `id` en total sobre muchas semillas. */
  const share = (input: Omit<PlanInput, "seed">, id: string): number => {
    let hits = 0;
    let total = 0;
    for (let seed = 0; seed < SEEDS; seed++) {
      const out = generatePlan({ ...input, seed });
      checkPlanInvariants({ ...input, seed }, out);
      for (const p of out.plan) {
        total += p.phrases;
        if (p.stepId === id) hits += p.phrases;
      }
    }
    return hits / total;
  };

  test("sin `order` = review: mismo plan con y sin el campo", () => {
    const weights = { sombrero: { due: true, difficulty: 8 } };
    for (let seed = 0; seed < 20; seed++) {
      expect(generatePlan({ ...base, weights, seed, order: "review" })).toEqual(
        generatePlan({ ...base, weights, seed }),
      );
    }
  });

  test("random ignora vencido, dificultad, favorito y popularidad", () => {
    const weights: Record<string, StepWeightFactors> = {
      sombrero: { due: true, difficulty: 10, favorite: true, popularity: 1 },
    };
    for (let seed = 0; seed < 20; seed++) {
      expect(generatePlan({ ...base, weights, seed, order: "random" })).toEqual(
        generatePlan({ ...base, seed, order: "random" }),
      );
    }
  });

  test("popular: el paso más popular sale mucho más que sin criterio", () => {
    const weights = { "vuelta-derecha": { popularity: 1 } };
    const plain = share({ ...base, order: "random" }, "vuelta-derecha");
    const popular = share(
      { ...base, weights, order: "popular" },
      "vuelta-derecha",
    );
    expect(popular).toBeGreaterThan(plain * 2);
  });

  test("difficulty: la dificultad (FSRS o de catálogo) manda", () => {
    const fsrs = { "vuelta-derecha": { difficulty: 10, catalogDifficulty: 1 } };
    const catalog = { "vuelta-derecha": { catalogDifficulty: 5 } };
    const plain = share({ ...base, order: "random" }, "vuelta-derecha");
    expect(
      share({ ...base, weights: fsrs, order: "difficulty" }, "vuelta-derecha"),
    ).toBeGreaterThan(plain * 2);
    expect(
      share(
        { ...base, weights: catalog, order: "difficulty" },
        "vuelta-derecha",
      ),
    ).toBeGreaterThan(plain * 2);
    // La FSRS gana a la de catálogo: dificultad 1 de repaso = peso 1 aunque el catálogo diga 5.
    const easy = { "vuelta-derecha": { difficulty: 1, catalogDifficulty: 5 } };
    expect(
      generatePlan({ ...base, weights: easy, seed: 4, order: "difficulty" }),
    ).toEqual(generatePlan({ ...base, seed: 4, order: "random" }));
  });
});
