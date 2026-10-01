/**
 * Runner de `docs/spec/vectors/combinaciones-*.json`: el core debe dar exactamente la
 * `salida` de cada vector (Kotlin/Swift pasarían los mismos archivos).
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CatalogStep,
  generatePlan,
  PlanError,
  type PlanInput,
  type PlanOrder,
  type StepWeightFactors,
  stepWeight,
  validateCatalog,
} from "@/supabase/functions/_shared/core/combinaciones.ts";
import { mulberry32 } from "@/supabase/functions/_shared/core/random.ts";
import { checkPlanInvariants } from "./core-combinaciones-invariants.ts";

const DIR = join(import.meta.dir, "../../docs/spec/vectors");
const files = readdirSync(DIR).filter(
  (f) => f.startsWith("combinaciones-") && f.endsWith(".json"),
);

interface PesoCaso {
  factores: StepWeightFactors;
  objetivoPendiente: boolean;
  repeticionInmediata: boolean;
  /** Criterio (por defecto `review`). */
  orden?: PlanOrder;
}

describe("vectores combinaciones-*", () => {
  test("hay vectores", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  for (const file of files) {
    const v = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    test(`${file}: ${v.descripcion}`, () => {
      const e = v.entrada;
      if (e.prng) {
        const got = e.prng.semillas.map((s: number) => {
          const r = mulberry32(s);
          return Array.from({ length: e.prng.cantidad }, () => r());
        });
        expect(got).toEqual(v.salida.secuencias);
      } else if (e.casos) {
        const got = (e.casos as PesoCaso[]).map((c) =>
          stepWeight(c.factores, {
            pendingTarget: c.objetivoPendiente,
            immediateRepeat: c.repeticionInmediata,
            order: c.orden,
          }),
        );
        expect(got).toEqual(v.salida.pesos);
      } else if (e.catalogo) {
        const c = e.catalogo as {
          positions: string[];
          steps: CatalogStep[];
          startPosition: string;
        };
        expect(validateCatalog(c)).toEqual(v.salida.problemas);
      } else if (v.salida.error) {
        let code: string | null = null;
        try {
          generatePlan(e as PlanInput);
        } catch (err) {
          expect(err).toBeInstanceOf(PlanError);
          code = (err as PlanError).code;
        }
        expect(code).toBe(v.salida.error);
      } else {
        const input = e as PlanInput;
        const got = generatePlan(input);
        expect(got).toEqual(v.salida);
        // Determinista y cumple las invariantes de la spec.
        expect(generatePlan(input)).toEqual(got);
        checkPlanInvariants(input, got);
      }
    });
  }
});
