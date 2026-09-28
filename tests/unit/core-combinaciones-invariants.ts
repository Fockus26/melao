/**
 * Invariantes de `docs/spec/combinaciones.md`, verificadas sobre un plan ya generado.
 * Las usan el runner de vectores y el test de propiedades.
 */
import { expect } from "bun:test";
import type {
  ComboStep,
  PlanInput,
  PlanResult,
} from "@/supabase/functions/_shared/core/combinaciones.ts";

export function checkPlanInvariants(input: PlanInput, out: PlanResult): void {
  const pool = new Map<string, ComboStep>();
  for (const s of [...input.steps, ...input.baseSteps]) {
    if (!pool.has(s.id)) pool.set(s.id, s);
  }
  const first = input.startPhrase ?? 0;

  // Frases contiguas y suma exacta = N.
  let phrase = first;
  for (const item of out.plan) {
    expect(item.startPhrase).toBe(phrase);
    phrase += item.phrases;
  }
  expect(phrase - first).toBe(input.phrases);
  if (input.phrases === 0) expect(out.plan).toEqual([]);

  // Todo paso ∈ steps ∪ baseSteps, con su duración.
  const steps = out.plan.map((item) => {
    const s = pool.get(item.stepId);
    expect(s).toBeDefined();
    expect(item.phrases).toBe((s as ComboStep).phrases);
    return s as ComboStep;
  });

  if (steps.length > 0) {
    // Primer paso canStart desde la posición inicial; último canEnd.
    expect(steps[0].canStart).toBe(true);
    expect(steps[0].startPosition).toBe(input.startPosition);
    expect(steps[steps.length - 1].canEnd).toBe(true);
  }
  // Posiciones encadenadas.
  for (let i = 1; i < steps.length; i++) {
    expect(steps[i].startPosition).toBe(steps[i - 1].endPosition);
  }

  // Cada target: o aparece o está en unplaced (nunca los dos).
  const inPlan = new Set(out.plan.map((p) => p.stepId));
  for (const t of new Set(input.targets ?? [])) {
    expect(inPlan.has(t)).toBe(!out.unplaced.includes(t));
  }
}

/**
 * Comprobación independiente (búsqueda exhaustiva con memo) de si existe algún plan que
 * contenga `target` (`null` = cualquier plan). Sirve para contrastar "targets colocados cuando es factible".
 */
export function existsPlanWith(
  input: PlanInput,
  target: string | null,
): boolean {
  const pool = new Map<string, ComboStep>();
  for (const s of [...input.steps, ...input.baseSteps]) {
    if (!pool.has(s.id)) pool.set(s.id, s);
  }
  if (input.phrases === 0) return target === null;
  if (target !== null && !pool.has(target)) return false;
  const all = [...pool.values()];
  const memo = new Map<string, boolean>();
  const go = (pos: string, left: number, isFirst: boolean, placed: boolean) => {
    const key = `${pos}|${left}|${isFirst}|${placed}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let ok = false;
    for (const s of all) {
      if (s.startPosition !== pos || s.phrases > left) continue;
      if (isFirst && !s.canStart) continue;
      const p = placed || s.id === target;
      const rest = left - s.phrases;
      if (rest === 0 ? s.canEnd && p : go(s.endPosition, rest, false, p)) {
        ok = true;
        break;
      }
    }
    memo.set(key, ok);
    return ok;
  };
  return go(input.startPosition, input.phrases, true, target === null);
}
