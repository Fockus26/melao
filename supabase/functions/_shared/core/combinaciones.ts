/**
 * Generador de combinaciones: el plan de una sesión (qué paso se baila en cada frase).
 *
 * Contrato: `docs/spec/combinaciones.md` (reglas 1–7, pesos, invariantes, algoritmo) y
 * los vectores `docs/spec/vectors/combinaciones-*.json`. TS puro: corre en Bun (tests) y en
 * Deno (Edge Function `plan-session`).
 *
 * Algoritmo (D042): recorrido aleatorio ponderado **guiado por factibilidad**.
 *   1. Se comprometen los `targets` en orden de entrada: cada uno se inserta en la lista de
 *      comprometidos si existe un plan completo que los contenga a todos en ese orden; si no
 *      cabe en ninguna posición de la lista, va a `unplaced`.
 *   2. Se genera el plan de izquierda a derecha. En cada paso solo son candidatos los pasos
 *      tras los cuales todavía existe una forma de terminar (suma exacta, `canEnd` al final)
 *      colocando los comprometidos pendientes. Entre ellos se elige por peso con el PRNG.
 * La factibilidad se precalcula con programación dinámica sobre (posición, frases
 * restantes, cuántos comprometidos faltan), así que el recorrido nunca retrocede ni se cuelga.
 */

import type { Enums } from "../database.types.ts";
import { mulberry32 } from "./random.ts";

// ── Pesos (combinaciones.md § Pesos). Cada factor solo aplica si su condición se cumple ──

/** Paso con tarjeta vencida. */
export const WEIGHT_DUE = 3;
/** Divisor de la dificultad FSRS en `1 + D / 10`. */
export const WEIGHT_DIFFICULTY_DIVISOR = 10;
/** Paso favorito del alumno. */
export const WEIGHT_FAVORITE = 2;
/** Target comprometido que aún no aparece en el plan. */
export const WEIGHT_PENDING_TARGET = 5;
/** Mismo paso que el anterior (no base y no `repeatable`), regla 7. */
export const WEIGHT_IMMEDIATE_REPEAT = 0.2;

export interface ComboStep {
  id: string;
  startPosition: string;
  endPosition: string;
  /** Duración en frases (entero ≥ 1). */
  phrases: number;
  canStart: boolean;
  canEnd: boolean;
  repeatable: boolean;
}

/** Datos del alumno sobre un paso; los ausentes no aplican su factor. */
export interface StepWeightFactors {
  /** Tarjeta FSRS vencida (`due_at ≤ ahora`). */
  due?: boolean;
  /** Dificultad FSRS de la tarjeta (1–10). */
  difficulty?: number;
  favorite?: boolean;
  /** Percentil de popularidad 0–1 (`step_popularity`). */
  popularity?: number;
}

export interface PlanInput {
  /** `N`: frases disponibles (entero ≥ 0). */
  phrases: number;
  /** Pasos permitidos tras los filtros. */
  steps: readonly ComboStep[];
  /** Pasos base (misma posición de inicio y fin): relleno. */
  baseSteps: readonly ComboStep[];
  startPosition: string;
  /** Pasos que deben aparecer (lección o vencidos), por prioridad. */
  targets?: readonly string[];
  weights?: Readonly<Record<string, StepWeightFactors>>;
  seed: number;
  /** Frase donde empieza el primer paso (por defecto 0; con intro corta, la de la ventana). */
  startPhrase?: number;
}

export interface PlanItem {
  stepId: string;
  startPhrase: number;
  phrases: number;
}

export interface PlanResult {
  plan: PlanItem[];
  unplaced: string[];
}

export type PlanErrorCode = "invalid_input" | "no_plan";

/** Entrada imposible: se lanza en vez de colgarse (catálogo inválido o `N` sin solución). */
export class PlanError extends Error {
  readonly code: PlanErrorCode;
  constructor(code: PlanErrorCode, message: string) {
    super(message);
    this.name = "PlanError";
    this.code = code;
  }
}

interface PoolStep extends ComboStep {
  /** Índices de posición (para las tablas). */
  from: number;
  to: number;
  inSteps: boolean;
  isBase: boolean;
}

/** Peso de un paso candidato. El orden de los productos es parte del contrato (spec). */
export function stepWeight(
  factors: StepWeightFactors | undefined,
  opts: { pendingTarget: boolean; immediateRepeat: boolean },
): number {
  let w = 1;
  if (factors?.due) w *= WEIGHT_DUE;
  if (factors?.difficulty !== undefined) {
    w *= 1 + factors.difficulty / WEIGHT_DIFFICULTY_DIVISOR;
  }
  if (factors?.favorite) w *= WEIGHT_FAVORITE;
  if (factors?.popularity !== undefined) w *= 1 + factors.popularity;
  if (opts.pendingTarget) w *= WEIGHT_PENDING_TARGET;
  if (opts.immediateRepeat) w *= WEIGHT_IMMEDIATE_REPEAT;
  return w;
}

function assertStep(s: ComboStep, base: boolean): void {
  if (!Number.isInteger(s.phrases) || s.phrases < 1) {
    throw new PlanError(
      "invalid_input",
      `El paso ${s.id} debe durar un entero ≥ 1 de frases`,
    );
  }
  if (base && s.startPosition !== s.endPosition) {
    throw new PlanError(
      "invalid_input",
      `El paso base ${s.id} debe empezar y terminar en la misma posición`,
    );
  }
}

/** Genera el plan de una sesión. Misma entrada + misma `seed` = mismo plan. */
export function generatePlan(input: PlanInput): PlanResult {
  const n = input.phrases;
  if (!Number.isInteger(n) || n < 0) {
    throw new PlanError("invalid_input", "`phrases` debe ser un entero ≥ 0");
  }
  const startPhrase = input.startPhrase ?? 0;
  const targets = [...new Set(input.targets ?? [])];
  if (n === 0) return { plan: [], unplaced: targets };

  // Pool = steps ∪ baseSteps, sin duplicar ids; conserva el orden (el sorteo depende de él).
  const baseIds = new Set(input.baseSteps.map((s) => s.id));
  const stepIds = new Set(input.steps.map((s) => s.id));
  const positions = new Map<string, number>();
  const posIndex = (p: string): number => {
    let i = positions.get(p);
    if (i === undefined) {
      i = positions.size;
      positions.set(p, i);
    }
    return i;
  };
  const start = posIndex(input.startPosition);
  const pool: PoolStep[] = [];
  const byId = new Map<string, PoolStep>();
  for (const s of input.steps) assertStep(s, false);
  for (const s of input.baseSteps) assertStep(s, true);
  for (const s of [...input.steps, ...input.baseSteps]) {
    if (byId.has(s.id)) continue;
    const p: PoolStep = {
      ...s,
      from: posIndex(s.startPosition),
      to: posIndex(s.endPosition),
      inSteps: stepIds.has(s.id),
      isBase: baseIds.has(s.id),
    };
    pool.push(p);
    byId.set(s.id, p);
  }
  const outgoing: PoolStep[][] = Array.from(
    { length: positions.size },
    () => [],
  );
  for (const s of pool) outgoing[s.from].push(s);

  const feas = new Feasibility(outgoing, positions.size, n);

  // 1. Comprometer targets en orden de prioridad.
  let committed: string[] = [];
  const unplacedSet = new Set<string>();
  for (const t of targets) {
    if (!byId.has(t)) {
      unplacedSet.add(t);
      continue;
    }
    let placed = false;
    // Primero al final (respeta la prioridad), luego antes de cada comprometido.
    for (let at = committed.length; at >= 0 && !placed; at--) {
      const list = [...committed.slice(0, at), t, ...committed.slice(at)];
      if (feas.fromStart(start, list)) {
        committed = list;
        placed = true;
      }
    }
    if (!placed) unplacedSet.add(t);
  }
  if (!feas.fromStart(start, committed)) {
    throw new PlanError(
      "no_plan",
      `No existe plan de ${n} frases desde la posición inicial con este catálogo`,
    );
  }

  // 2. Recorrido ponderado guiado por factibilidad.
  const rand = mulberry32(input.seed);
  const plan: PlanItem[] = [];
  let pos = start;
  let left = n;
  let prev: string | null = null;
  let pending = committed;
  while (left > 0) {
    const first = plan.length === 0;
    const ok = (s: PoolStep) =>
      (!first || s.canStart) && feas.after(s, left, pending);
    let cands = outgoing[pos].filter((s) => s.inSteps && ok(s));
    // Regla 5: sin candidato válido en `steps`, relleno con base desde aquí.
    if (cands.length === 0)
      cands = outgoing[pos].filter((s) => s.isBase && ok(s));
    if (cands.length === 0) {
      // No debería ocurrir: `fromStart` garantizó un camino.
      throw new PlanError("no_plan", "El generador se quedó sin candidatos");
    }
    const ws = cands.map((s) =>
      stepWeight(input.weights?.[s.id], {
        pendingTarget: pending.includes(s.id),
        immediateRepeat: s.id === prev && !s.repeatable && !s.isBase,
      }),
    );
    const chosen = pick(cands, ws, rand());
    plan.push({
      stepId: chosen.id,
      startPhrase: startPhrase + (n - left),
      phrases: chosen.phrases,
    });
    pending = without(pending, chosen.id);
    left -= chosen.phrases;
    pos = chosen.to;
    prev = chosen.id;
  }

  const inPlan = new Set(plan.map((p) => p.stepId));
  return {
    plan,
    unplaced: targets.filter((t) => unplacedSet.has(t) || !inPlan.has(t)),
  };
}

/** Elección ponderada: acumula en el orden de `items` y toma el primero con `x < acumulado`. */
function pick<T>(
  items: readonly T[],
  weights: readonly number[],
  u: number,
): T {
  const total = weights.reduce((a, b) => a + b, 0);
  const x = u * total;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (x < acc) return items[i];
  }
  return items[items.length - 1];
}

/** Quita la primera aparición de `id`. */
function without(list: readonly string[], id: string): string[] {
  const i = list.indexOf(id);
  return i < 0 ? [...list] : [...list.slice(0, i), ...list.slice(i + 1)];
}

/**
 * Tablas de factibilidad. Para una lista ordenada `L` de pasos obligatorios,
 * `G_j(p, r)` = desde la posición `p` con `r ≥ 1` frases por llenar (no es el primer paso)
 * existe una continuación que coloca `L[j..]` en ese orden y termina justo con un `canEnd`.
 * Se calcula con `j` descendente y `r` ascendente: O(|L| · N · pasos).
 */
class Feasibility {
  private readonly cache = new Map<string, Uint8Array[]>();

  constructor(
    private readonly outgoing: readonly PoolStep[][],
    private readonly nPositions: number,
    private readonly n: number,
  ) {}

  /** ¿Existe un plan completo desde el inicio que coloque `list` en orden? */
  fromStart(start: number, list: readonly string[]): boolean {
    return this.outgoing[start].some(
      (s) => s.canStart && this.after(s, this.n, list),
    );
  }

  /** ¿Tomar `s` con `left` frases por llenar deja una continuación válida para `list`? */
  after(s: PoolStep, left: number, list: readonly string[]): boolean {
    if (s.phrases > left) return false;
    const rest = without(list, s.id);
    const r = left - s.phrases;
    if (r === 0) return s.canEnd && rest.length === 0;
    return this.table(rest)[0][s.to * (this.n + 1) + r] === 1;
  }

  private table(list: readonly string[]): Uint8Array[] {
    const key = list.join("\u0000");
    const hit = this.cache.get(key);
    if (hit) return hit;
    const k = list.length;
    const stride = this.n + 1;
    const g: Uint8Array[] = Array.from(
      { length: k + 1 },
      () => new Uint8Array(this.nPositions * stride),
    );
    for (let j = k; j >= 0; j--) {
      for (let r = 1; r <= this.n; r++) {
        for (let p = 0; p < this.nPositions; p++) {
          for (const s of this.outgoing[p]) {
            if (s.phrases > r) continue;
            const nj = j < k && s.id === list[j] ? j + 1 : j;
            const rest = r - s.phrases;
            const ok =
              rest === 0
                ? s.canEnd && nj === k
                : g[nj][s.to * stride + rest] === 1;
            if (ok) {
              g[j][p * stride + r] = 1;
              break;
            }
          }
        }
      }
    }
    this.cache.set(key, g);
    return g;
  }
}

// ── Validación del catálogo (panel admin) ───────────────────────────────────

export interface CatalogStep extends ComboStep {
  category: Enums<"step_category">;
}

export type CatalogIssueCode =
  | "no_start_step"
  | "no_base_reachable"
  | "no_end_reachable";

export interface CatalogIssue {
  code: CatalogIssueCode;
  position: string;
}

/** Paso de relleno: categoría base que empieza y termina en la misma posición. */
export function isBaseStep(step: CatalogStep): boolean {
  return step.category === "base" && step.startPosition === step.endPosition;
}

/**
 * Valida un catálogo de un estilo (combinaciones.md § Validación). Devuelve los problemas;
 * lista vacía = válido. `positions` son todas las posiciones del estilo (las que no tienen
 * pasos también se revisan).
 */
export function validateCatalog(catalog: {
  positions: readonly string[];
  steps: readonly CatalogStep[];
  startPosition: string;
}): CatalogIssue[] {
  const all = [
    ...new Set([
      catalog.startPosition,
      ...catalog.positions,
      ...catalog.steps.flatMap((s) => [s.startPosition, s.endPosition]),
    ]),
  ];
  const next = new Map<string, Set<string>>(all.map((p) => [p, new Set()]));
  const hasBase = new Set<string>();
  const endFrom = new Set<string>();
  for (const s of catalog.steps) {
    next.get(s.startPosition)?.add(s.endPosition);
    if (isBaseStep(s)) hasBase.add(s.startPosition);
    if (s.canEnd) endFrom.add(s.startPosition);
  }
  const reachable = (from: string): Set<string> => {
    const seen = new Set([from]);
    const queue = [from];
    while (queue.length > 0) {
      const p = queue.shift() as string;
      for (const q of next.get(p) ?? []) {
        if (!seen.has(q)) {
          seen.add(q);
          queue.push(q);
        }
      }
    }
    return seen;
  };

  const issues: CatalogIssue[] = [];
  if (
    !catalog.steps.some(
      (s) => s.canStart && s.startPosition === catalog.startPosition,
    )
  ) {
    issues.push({ code: "no_start_step", position: catalog.startPosition });
  }
  for (const p of all) {
    const r = [...reachable(p)];
    if (!r.some((q) => hasBase.has(q))) {
      issues.push({ code: "no_base_reachable", position: p });
    }
    if (!r.some((q) => endFrom.has(q))) {
      issues.push({ code: "no_end_reachable", position: p });
    }
  }
  return issues;
}
