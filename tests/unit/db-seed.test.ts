// Datos de ejemplo (supabase/seed.sql, D053–D055): se aplican sobre las migraciones, son
// idempotentes y el catálogo sembrado es coherente con el core (estilos, grafo, rejilla).
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite } from "@electric-sql/pglite";
import {
  type CatalogStep,
  generatePlan,
  isBaseStep,
  validateCatalog,
} from "@/supabase/functions/_shared/core/combinaciones.ts";
import {
  type Anchor,
  assertAnchors,
  beatToMs,
} from "@/supabase/functions/_shared/core/grid.ts";
import {
  MERENGUE,
  SALSA_CASINO,
  type StyleConfig,
} from "@/supabase/functions/_shared/core/style.ts";
import { applySeed, createDb } from "../db/harness";

let db: PGlite;

const TABLES = [
  "dance_styles",
  "positions",
  "steps",
  "step_prerequisites",
  "songs",
  "song_styles",
  "courses",
  "course_units",
  "lessons",
  "lesson_steps",
] as const;

async function counts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of TABLES) {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.${t}`,
    );
    out[t] = rows[0].n;
  }
  return out;
}

beforeAll(async () => {
  db = await createDb();
  await applySeed(db);
});

describe("seed", () => {
  test("es idempotente: una segunda corrida no cambia nada", async () => {
    const before = await counts();
    const { rows: stamp } = await db.query<{ t: string }>(
      "select max(updated_at)::text as t from public.steps",
    );
    await applySeed(db);
    expect(await counts()).toEqual(before);
    const { rows: again } = await db.query<{ t: string }>(
      "select max(updated_at)::text as t from public.steps",
    );
    expect(again[0].t).toBe(stamp[0].t);
    expect(before.dance_styles).toBe(2);
    expect(before.steps).toBeGreaterThanOrEqual(30);
  });

  test("no siembra usuarios ni datos de alumno", async () => {
    for (const t of ["auth.users", "public.subscriptions"]) {
      const { rows } = await db.query<{ n: number }>(
        `select count(*)::int as n from ${t}`,
      );
      expect(rows[0].n).toBe(0);
    }
  });

  const CORE: Record<string, StyleConfig> = {
    "salsa-casino": SALSA_CASINO,
    merengue: MERENGUE,
  };

  test("los estilos coinciden campo a campo con el core", async () => {
    const { rows } = await db.query<{
      slug: string;
      beats_per_phrase: number;
      spoken_beats: number[];
      call_beat: number;
      call_span_beats: number;
      lead_in_phrases: number;
      has_roles: boolean;
      published: boolean;
      start_position_id: string | null;
    }>("select * from public.dance_styles order by sort_order");
    expect(rows.map((r) => r.slug)).toEqual(["salsa-casino", "merengue"]);
    for (const r of rows) {
      const core = CORE[r.slug];
      expect({
        beatsPerPhrase: r.beats_per_phrase,
        spokenBeats: r.spoken_beats,
        callBeat: r.call_beat,
        callSpanBeats: r.call_span_beats,
        leadInPhrases: r.lead_in_phrases,
      }).toEqual({ ...core, spokenBeats: [...core.spokenBeats] });
      expect(r.has_roles).toBe(true);
      expect(r.published).toBe(true);
      expect(r.start_position_id).not.toBeNull();
    }
  });

  describe.each(["salsa-casino", "merengue"])("catálogo de %s", (slug) => {
    let steps: CatalogStep[];
    let positions: string[];
    let start: string;

    beforeAll(async () => {
      const { rows: style } = await db.query<{ start: string }>(
        `select p.slug as start from public.dance_styles d
         join public.positions p on p.id = d.start_position_id where d.slug = $1`,
        [slug],
      );
      start = style[0].start;
      const { rows: pos } = await db.query<{ slug: string }>(
        `select p.slug from public.positions p
         join public.dance_styles d on d.id = p.style_id where d.slug = $1`,
        [slug],
      );
      positions = pos.map((p) => p.slug);
      const { rows } = await db.query<{
        slug: string;
        category: CatalogStep["category"];
        from: string;
        to: string;
        phrases: number;
        can_start: boolean;
        can_end: boolean;
        repeatable: boolean;
      }>(
        `select s.slug, s.category, ps.slug as from, pe.slug as to, s.phrases,
                s.can_start, s.can_end, s.repeatable
         from public.steps s
         join public.dance_styles d on d.id = s.style_id
         join public.positions ps on ps.id = s.start_position_id
         join public.positions pe on pe.id = s.end_position_id
         where d.slug = $1 and s.published`,
        [slug],
      );
      steps = rows.map((r) => ({
        id: r.slug,
        category: r.category,
        startPosition: r.from,
        endPosition: r.to,
        phrases: r.phrases,
        canStart: r.can_start,
        canEnd: r.can_end,
        repeatable: r.repeatable,
      }));
    });

    test("pasa validateCatalog sin problemas", () => {
      expect(steps.length).toBeGreaterThanOrEqual(10);
      expect(
        validateCatalog({ positions, steps, startPosition: start }),
      ).toEqual([]);
    });

    test("tiene paso base en la posición inicial y genera planes", () => {
      const baseSteps = steps.filter(isBaseStep);
      expect(baseSteps.some((s) => s.startPosition === start)).toBe(true);
      for (let n = 1; n <= 16; n++) {
        const { plan } = generatePlan({
          phrases: n,
          steps,
          baseSteps,
          startPosition: start,
          seed: n,
        });
        expect(plan.reduce((sum, p) => sum + p.phrases, 0)).toBe(n);
      }
    });
  });

  test("cada lección apunta a pasos de su estilo y respeta los prerrequisitos", async () => {
    const { rows } = await db.query<{
      course_style: string;
      step_style: string;
      unit: number;
      lesson: number;
      step: string;
    }>(
      `select c.style_id as course_style, s.style_id as step_style, u.position as unit,
              l.position as lesson, s.id as step
       from public.lesson_steps ls
       join public.lessons l on l.id = ls.lesson_id
       join public.course_units u on u.id = l.unit_id
       join public.courses c on c.id = u.course_id
       join public.steps s on s.id = ls.step_id
       order by c.style_id, u.position, l.position, ls.position`,
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.step_style).toBe(r.course_style);

    // Un prerrequisito se enseña en una lección anterior o en la misma.
    const order = new Map(rows.map((r) => [r.step, r.unit * 100 + r.lesson]));
    const { rows: prereqs } = await db.query<{ step: string; req: string }>(
      "select step_id as step, requires_step_id as req from public.step_prerequisites",
    );
    for (const p of prereqs) {
      const at = order.get(p.step);
      if (at === undefined) continue;
      expect(order.get(p.req)).toBeLessThanOrEqual(at);
    }

    const { rows: shape } = await db.query<{ units: number; lessons: number }>(
      `select count(distinct u.id)::int as units, count(l.id)::int as lessons
       from public.courses c
       join public.course_units u on u.course_id = c.id
       join public.lessons l on l.unit_id = u.id
       group by c.id`,
    );
    expect(shape).toEqual([
      { units: 2, lessons: 6 },
      { units: 2, lessons: 6 },
    ]);
  });

  test("ninguna canción está publicada ni tiene audio o licencia", async () => {
    const { rows } = await db.query<{
      published: boolean;
      audio_path: string | null;
      license_source: string | null;
      beat_grid: Anchor[];
      duration_ms: number;
      dance_end_ms: number;
      bpm: string;
      styles: number;
    }>(
      `select s.*, (select count(*)::int from public.song_styles ss where ss.song_id = s.id) as styles
       from public.songs s`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const r of rows) {
      expect(r.published).toBe(false);
      expect(r.audio_path).toBeNull();
      expect(r.license_source).toBeNull();
      expect(r.styles).toBe(1);
      assertAnchors(r.beat_grid);
      expect(r.dance_end_ms).toBeLessThanOrEqual(r.duration_ms);
      // El BPM guardado es el promedio de la rejilla (±0,1).
      const first = r.beat_grid[0];
      const last = r.beat_grid[r.beat_grid.length - 1];
      const avg = (60000 * (last.beat - first.beat)) / (last.tMs - first.tMs);
      expect(Math.abs(avg - Number(r.bpm))).toBeLessThanOrEqual(0.1);
      expect(beatToMs(r.beat_grid, last.beat)).toBeLessThanOrEqual(
        r.dance_end_ms,
      );
    }
  });
});
