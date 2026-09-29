/**
 * Runner de `docs/spec/vectors/srs-*.json`. Cada vector es una secuencia de operaciones
 * sobre una tarjeta; los reales (`stability`, `difficulty`) se comparan con tolerancia 1e-6.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isDue,
  markKnown,
  markLearning,
  reviewCard,
  type SrsCard,
  toFsrsRating,
} from "@/supabase/functions/_shared/core/srs.ts";

const DIR = join(import.meta.dir, "../../docs/spec/vectors");
const files = readdirSync(DIR).filter(
  (f) => f.startsWith("srs-") && f.endsWith(".json"),
);
const FSRS_NAMES = ["Manual", "Again", "Hard", "Good", "Easy"];

type Op =
  | { op: "markLearning"; now: string }
  | { op: "markKnown"; now: string }
  | { op: "review"; rating: number; now: string; card?: SrsCard }
  | { op: "isDue"; now: string };

// biome-ignore lint/suspicious/noExplicitAny: salida JSON libre de cada vector
type Json = any;

/** Igualdad profunda con tolerancia para números no enteros. */
function expectClose(got: Json, want: Json): void {
  if (typeof want === "number" && !Number.isInteger(want)) {
    expect(got).toBeCloseTo(want, 6);
  } else if (want !== null && typeof want === "object") {
    expect(Object.keys(got).sort()).toEqual(Object.keys(want).sort());
    for (const k of Object.keys(want)) expectClose(got[k], want[k]);
  } else {
    expect(got).toEqual(want);
  }
}

describe("vectores srs-*", () => {
  test("hay vectores", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  for (const file of files) {
    const v = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    test(`${file}: ${v.descripcion}`, () => {
      let card: SrsCard | null = null;
      const got: Json[] = [];
      for (const p of v.entrada.pasos as Op[]) {
        const now = new Date(p.now);
        if (p.op === "markLearning") {
          card = markLearning(now);
          got.push({ card });
        } else if (p.op === "markKnown") {
          const r = markKnown(now);
          card = r.card;
          got.push(r);
        } else if (p.op === "review") {
          const from = p.card ?? card;
          if (!from) throw new Error(`${file}: review sin tarjeta`);
          const r = reviewCard(from, p.rating, now);
          card = r.card;
          // srs-mapeo también fija el nombre FSRS de la calificación.
          got.push(
            p.card ? { fsrs: FSRS_NAMES[toFsrsRating(p.rating)], ...r } : r,
          );
        } else {
          if (!card) throw new Error(`${file}: isDue sin tarjeta`);
          got.push({ due: isDue(card, now) });
        }
      }
      expectClose(got, v.salida.resultados);
    });
  }
});
