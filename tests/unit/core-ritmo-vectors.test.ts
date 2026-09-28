/**
 * Runner de vectores del motor de ritmo: `docs/spec/vectors/ritmo-*.json` (rejilla, entrada,
 * frases disponibles) y `timeline-*.json` (línea de tiempo del coach). Kotlin/Swift pasan
 * los mismos archivos.
 */

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type Anchor,
  beatToMs,
  msToBeat,
} from "@/supabase/functions/_shared/core/grid.ts";
import {
  availablePhrases,
  entryShiftPhrases,
  type PhraseWindow,
  phraseWindow,
} from "@/supabase/functions/_shared/core/phrases.ts";
import type { StyleConfig } from "@/supabase/functions/_shared/core/style.ts";
import {
  buildTimeline,
  type PlanItem,
  type TimelineEvent,
} from "@/supabase/functions/_shared/core/timeline.ts";

const DIR = join(import.meta.dir, "../../docs/spec/vectors");

function load<T>(prefix: string): [string, T][] {
  const files = readdirSync(DIR).filter(
    (f) => f.startsWith(prefix) && f.endsWith(".json"),
  );
  return files.map((f) => [f, JSON.parse(readFileSync(join(DIR, f), "utf8"))]);
}

interface RitmoVector {
  descripcion: string;
  entrada: {
    anchors: Anchor[];
    style?: StyleConfig;
    danceEndMs?: number;
    beatToMs?: number[];
    msToBeat?: number[];
  };
  salida: {
    beatToMs?: number[];
    msToBeat?: number[];
    entryShiftPhrases?: number;
    availablePhrases?: number;
    phraseWindow?: PhraseWindow;
  };
}

interface TimelineVector {
  descripcion: string;
  entrada: { style: StyleConfig; anchors: Anchor[]; plan: PlanItem[] };
  salida: { events: TimelineEvent[] };
}

const ritmo = load<RitmoVector>("ritmo-");
const timeline = load<TimelineVector>("timeline-");

describe("vectores ritmo-*", () => {
  test("hay al menos 4", () => expect(ritmo.length).toBeGreaterThanOrEqual(4));

  for (const [file, { descripcion, entrada, salida }] of ritmo) {
    test(`${file}: ${descripcion}`, () => {
      const { anchors, style, danceEndMs } = entrada;
      if (salida.beatToMs) {
        const got = (entrada.beatToMs ?? []).map((b) => beatToMs(anchors, b));
        expect(got).toHaveLength(salida.beatToMs.length);
        salida.beatToMs.forEach((want, i) => {
          expect(got[i]).toBeCloseTo(want, 6);
        });
      }
      if (salida.msToBeat) {
        const got = (entrada.msToBeat ?? []).map((m) => msToBeat(anchors, m));
        expect(got).toHaveLength(salida.msToBeat.length);
        salida.msToBeat.forEach((want, i) => {
          expect(got[i]).toBeCloseTo(want, 9);
        });
      }
      if (salida.entryShiftPhrases !== undefined) {
        if (!style) throw new Error(`${file}: falta entrada.style`);
        expect(entryShiftPhrases(anchors, style)).toBe(
          salida.entryShiftPhrases,
        );
      }
      if (salida.availablePhrases !== undefined || salida.phraseWindow) {
        if (!style || danceEndMs === undefined) {
          throw new Error(`${file}: faltan entrada.style o entrada.danceEndMs`);
        }
        if (salida.availablePhrases !== undefined) {
          expect(
            availablePhrases(anchors, danceEndMs, style.beatsPerPhrase),
          ).toBe(salida.availablePhrases);
        }
        if (salida.phraseWindow) {
          expect(phraseWindow(style, anchors, danceEndMs)).toEqual(
            salida.phraseWindow,
          );
        }
      }
    });
  }
});

describe("vectores timeline-*", () => {
  test("hay al menos 4", () =>
    expect(timeline.length).toBeGreaterThanOrEqual(4));

  for (const [file, { descripcion, entrada, salida }] of timeline) {
    test(`${file}: ${descripcion}`, () => {
      expect(
        buildTimeline(entrada.style, entrada.anchors, entrada.plan),
      ).toEqual(salida.events);
    });
  }
});
