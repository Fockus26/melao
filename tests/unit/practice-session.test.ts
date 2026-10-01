/**
 * Sesión guardada → escenario: la línea de tiempo recalculada desde el plan guardado (sin slug)
 * tiene que salir idéntica a la de los vectores (`docs/spec/vectors/timeline-*.json`), que es lo
 * que devolvió `plan-session`. Y el parseo de lo que viene de la base.
 */

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  gridBpm,
  parseBeatGrid,
  parseStoredPlan,
  practiceStage,
  recomputeTimeline,
  SESSION_LINKS,
} from "@/lib/stage/practice-session";
import type { Anchor } from "@/supabase/functions/_shared/core/grid.ts";
import type { StyleConfig } from "@/supabase/functions/_shared/core/style.ts";
import type {
  PlanItem,
  TimelineEvent,
} from "@/supabase/functions/_shared/core/timeline.ts";

const DIR = join(import.meta.dir, "../../docs/spec/vectors");

interface TimelineVector {
  entrada: { style: StyleConfig; anchors: Anchor[]; plan: PlanItem[] };
  salida: { events: TimelineEvent[] };
}

const vectors: [string, TimelineVector][] = readdirSync(DIR)
  .filter((f) => f.startsWith("timeline-") && f.endsWith(".json"))
  .map((f) => [f, JSON.parse(readFileSync(join(DIR, f), "utf8"))]);

describe("recomputeTimeline con los vectores", () => {
  test("hay vectores", () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  for (const [file, v] of vectors) {
    test(file, () => {
      const { style, anchors, plan } = v.entrada;
      // Lo que guarda `practice_sessions.plan`: sin slug (lo pone `steps`).
      const stored = parseStoredPlan(
        JSON.parse(
          JSON.stringify(plan.map(({ slug: _slug, ...item }) => item)),
        ),
      );
      expect(stored).not.toBeNull();
      const steps = Object.fromEntries(
        plan.map((p) => [p.stepId, { slug: p.slug, name: p.slug }]),
      );
      expect(recomputeTimeline(style, anchors, stored ?? [], steps)).toEqual(
        v.salida.events,
      );
    });
  }
});

describe("parseo de la base", () => {
  test("plan: forma esperada o null", () => {
    expect(
      parseStoredPlan([{ stepId: "a", startPhrase: 1, phrases: 2 }]),
    ).toEqual([{ stepId: "a", startPhrase: 1, phrases: 2 }]);
    expect(parseStoredPlan({})).toBeNull();
    expect(parseStoredPlan([{ stepId: "a", startPhrase: 1.5 }])).toBeNull();
  });

  test("BPM de la rejilla", () => {
    expect(
      gridBpm([
        { beat: 0, tMs: 1000 },
        { beat: 1, tMs: 1500 },
      ]),
    ).toBeCloseTo(120, 9);
  });

  test("rejilla: válida o null", () => {
    const grid = [
      { beat: 0, tMs: 1000 },
      { beat: 1, tMs: 1500 },
    ];
    expect(parseBeatGrid(grid)).toEqual(grid);
    expect(parseBeatGrid(null)).toBeNull();
    expect(parseBeatGrid([{ beat: 0, tMs: 1000 }])).toBeNull();
    expect(parseBeatGrid([{ beat: "0", tMs: 1000 }, ...grid])).toBeNull();
  });

  test("un paso que ya no existe usa su id como slug", () => {
    const [, v] = vectors[0];
    const plan = v.entrada.plan.map(({ slug: _s, ...p }) => p);
    const events = recomputeTimeline(
      v.entrada.style,
      v.entrada.anchors,
      plan,
      {},
    );
    const call = events.find((e) => e.kind === "call");
    expect(call?.clip).toBe(`step.${call?.stepId}`);
  });
});

describe("practiceStage", () => {
  test("arma el escenario un poco antes de la entrada", () => {
    const [, v] = vectors.find(([f]) => f.includes("salsa-anuncio")) ?? [];
    if (!v) throw new Error("falta el vector");
    const plan = v.entrada.plan.map(({ slug: _s, ...p }) => p);
    const stage = practiceStage({
      sessionId: "s",
      styleName: "Salsa casino",
      bpm: 120,
      style: v.entrada.style,
      plan,
      steps: Object.fromEntries(
        v.entrada.plan.map((p) => [p.stepId, { slug: p.slug, name: p.slug }]),
      ),
      beatGrid: v.entrada.anchors,
      songDurationMs: null,
      latencyOffsetMs: null,
    });
    expect(stage.session.timeline.events).toEqual(v.salida.events);
    expect(stage.startMs).toBe(
      Math.max(0, (v.salida.events[0]?.tMs ?? 0) - 1000),
    );
  });

  test("enlaces del contrato", () => {
    expect(SESSION_LINKS.session("a b")).toBe("/app/practice/session?id=a%20b");
    expect(SESSION_LINKS.result("x")).toBe("/app/practice/result?id=x");
  });
});
