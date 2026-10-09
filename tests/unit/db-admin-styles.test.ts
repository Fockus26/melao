// Admin · Estilos (20261003160000_admin_styles.sql, D163–D167) contra PGlite con el seed: guardar
// datos y configuración del motor, bandas de BPM, publicar solo con posición inicial, borrar solo
// estilos vacíos sin publicar, posiciones en uso, y las lecturas `admin_styles` /
// `admin_style_issues`.
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import {
  applySeed,
  asAnon,
  asUser,
  createDb,
  createUser,
  DB_BOOT_TIMEOUT_MS,
} from "../db/harness";

const SALSA = "a0000000-0000-4000-8000-000000000001";
const MERENGUE = "a0000000-0000-4000-8000-000000000002";
const GUAPEA_POS = "a1000000-0000-4000-8000-000000000001";
const CERRADA_POS = "a1000000-0000-4000-8000-000000000002";
const MERENGUE_POS = "a2000000-0000-4000-8000-000000000001";

let db: PGlite;
let ana: string; // alumna
let cesar: string; // admin

const fields = (over: Record<string, unknown> = {}) => ({
  slug: "bachata",
  name: "  Bachata  ",
  sort_order: 30,
  has_roles: true,
  beats_per_phrase: 8,
  spoken_beats: [1, 2, 3, 5, 6, 7],
  call_beat: 5,
  call_span_beats: 2,
  lead_in_phrases: 1,
  difficulty_bpm_bands: null,
  start_position_id: null,
  ...over,
});

const save = async (
  tx: Transaction,
  over: Record<string, unknown> = {},
  id: string | null = null,
  start: { name: string; slug: string } | null = null,
) =>
  (
    await tx.query<{ id: string }>(
      "select public.admin_save_style($1, $2, $3) as id",
      [id, JSON.stringify(fields(over)), start ? JSON.stringify(start) : null],
    )
  ).rows[0].id;

/** Los campos de salsa casino tal como están, con cambios. */
const salsa = (over: Record<string, unknown> = {}) => ({
  slug: "salsa-casino",
  name: "Salsa casino",
  sort_order: 1,
  spoken_beats: [1, 2, 3, 5, 6, 7],
  difficulty_bpm_bands: [170, 185, 200, 215],
  start_position_id: GUAPEA_POS,
  ...over,
});

type StyleRow = {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  spoken_beats: number[];
  difficulty_bpm_bands: number[] | null;
  start_position_id: string | null;
  step_count: number;
  steps_published: number;
  song_count: number;
  has_course: boolean;
  positions: { id: string; slug: string; name: string; step_count: number }[];
};
const list = async (tx: Transaction) =>
  (await tx.query<StyleRow>("select * from public.admin_styles()")).rows;

const issues = async (tx: Transaction, style: string) =>
  (
    await tx.query<{ issues: string[] | null }>(
      "select public.admin_style_issues($1) as issues",
      [style],
    )
  ).rows[0].issues;

/** Código SQLSTATE del error que lanza `fn`. */
async function codeOf(fn: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

beforeAll(async () => {
  db = await createDb();
  await applySeed(db);
  ana = await createUser(db, "ana@example.com");
  cesar = await createUser(db, "cesar@example.com");
  await db.query(
    "update public.profiles set app_role = 'admin' where id = $1",
    [cesar],
  );
}, DB_BOOT_TIMEOUT_MS);

describe("admin_styles y admin_style_issues", () => {
  test("el admin ve todos los estilos con contadores y posiciones en uso", async () => {
    const rows = await asUser(db, cesar, list);
    expect(rows.map((r) => r.slug)).toEqual(["salsa-casino", "merengue"]);
    const s = rows[0];
    expect(s.step_count).toBeGreaterThan(0);
    expect(s.steps_published).toBe(s.step_count);
    expect(s.song_count).toBeGreaterThan(0);
    expect(s.has_course).toBe(true);
    expect(s.spoken_beats).toEqual([1, 2, 3, 5, 6, 7]);
    expect(s.positions.map((p) => p.name)).toEqual([
      "Abierta",
      "Cerrada",
      "Guapea",
    ]);
    expect(s.positions.every((p) => p.step_count > 0)).toBe(true);
    expect(await asUser(db, cesar, (tx) => issues(tx, SALSA))).toEqual([]);
  });

  test("la alumna no ve nada y el anónimo no puede llamarlas", async () => {
    expect(await asUser(db, ana, list)).toEqual([]);
    expect(await asUser(db, ana, (tx) => issues(tx, SALSA))).toBeNull();
    await expect(asAnon(db, list)).rejects.toThrow(/permission denied/);
  });

  test("la alumna no ve un estilo sin publicar ni escribe estilos", async () => {
    const seen = await asUser(db, ana, async (tx) => {
      await tx.query(
        "update public.dance_styles set published = false where id = $1",
        [MERENGUE],
      );
      return (
        await tx.query<{ slug: string }>("select slug from public.dance_styles")
      ).rows.map((r) => r.slug);
    });
    // El update de la alumna no toca ninguna fila (RLS): merengue sigue publicado.
    expect(seen).toEqual(["salsa-casino", "merengue"]);
    let draftSeen: string[] = [];
    await db.transaction(async (tx) => {
      await tx.query(
        "update public.dance_styles set published = false where id = $1",
        [MERENGUE],
      );
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
        ana,
      ]);
      await tx.exec("set local role authenticated");
      draftSeen = (
        await tx.query<{ slug: string }>("select slug from public.dance_styles")
      ).rows.map((r) => r.slug);
      await tx.rollback();
    });
    expect(draftSeen).toEqual(["salsa-casino"]);
    expect(await codeOf(() => asUser(db, ana, (tx) => save(tx)))).toBe("42501");
    await expect(asAnon(db, (tx) => save(tx))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("admin_save_style", () => {
  test("crea un borrador con su posición inicial en una transacción", async () => {
    const result = await asUser(db, cesar, async (tx) => {
      const id = await save(tx, {}, null, { name: "Abrazo", slug: "abrazo" });
      const row = (await list(tx)).find((r) => r.id === id);
      return { row, issues: await issues(tx, id) };
    });
    expect(result.row).toMatchObject({
      name: "Bachata",
      published: false,
      step_count: 0,
      song_count: 0,
      has_course: false,
      difficulty_bpm_bands: null,
    });
    expect(result.row?.positions).toHaveLength(1);
    expect(result.row?.start_position_id).toBe(result.row?.positions[0].id);
    expect(result.issues).toEqual([]);
  });

  test("sin posición inicial se crea, pero no se puede publicar (ME008)", async () => {
    const result = await asUser(db, cesar, async (tx) => {
      const id = await save(tx);
      const found = await issues(tx, id);
      const code = await codeOf(() =>
        tx.query(
          "update public.dance_styles set published = true where id = $1",
          [id],
        ),
      );
      return { found, code };
    });
    expect(result.found).toEqual(["missing_start_position"]);
    expect(result.code).toBe("ME008");
  });

  test("edita la configuración del motor y las bandas", async () => {
    const row = await asUser(db, cesar, async (tx) => {
      await save(
        tx,
        salsa({
          spoken_beats: [1, 3, 5, 7],
          call_beat: 6,
          call_span_beats: 3,
          lead_in_phrases: 2,
          difficulty_bpm_bands: [160, 175, 190, 210],
        }),
        SALSA,
      );
      return (
        await tx.query<{
          spoken_beats: number[];
          call_beat: number;
          lead_in_phrases: number;
          difficulty_bpm_bands: number[];
        }>(
          "select spoken_beats, call_beat, lead_in_phrases, difficulty_bpm_bands from public.dance_styles where id = $1",
          [SALSA],
        )
      ).rows[0];
    });
    expect(row).toEqual({
      spoken_beats: [1, 3, 5, 7],
      call_beat: 6,
      lead_in_phrases: 2,
      difficulty_bpm_bands: [160, 175, 190, 210],
    });
  });

  test("bandas vacías quedan en null (canciones sin dificultad automática)", async () => {
    const bands = await asUser(db, cesar, async (tx) => {
      await save(tx, salsa({ difficulty_bpm_bands: [] }), SALSA);
      return (
        await tx.query<{ b: number[] | null }>(
          "select difficulty_bpm_bands as b from public.dance_styles where id = $1",
          [SALSA],
        )
      ).rows[0].b;
    });
    expect(bands).toBeNull();
  });

  test("configuración inválida → código propio", async () => {
    const codeFor = (over: Record<string, unknown>) =>
      codeOf(() => asUser(db, cesar, (tx) => save(tx, salsa(over), SALSA)));
    expect(await codeFor({ spoken_beats: [] })).toBe("ME001");
    expect(await codeFor({ spoken_beats: [1, 9] })).toBe("ME001");
    expect(await codeFor({ spoken_beats: [1, 1] })).toBe("ME001");
    // Bajar los tiempos por frase deja fuera los tiempos hablados de antes.
    expect(await codeFor({ beats_per_phrase: 4 })).toBe("ME001");
    expect(await codeFor({ call_beat: 8, call_span_beats: 2 })).toBe("ME002");
    expect(await codeFor({ call_span_beats: 5 })).toBe("ME002");
    expect(await codeFor({ difficulty_bpm_bands: [170, 160, 200, 215] })).toBe(
      "ME003",
    );
    expect(await codeFor({ difficulty_bpm_bands: [170, 170, 200, 215] })).toBe(
      "ME003",
    );
    expect(await codeFor({ difficulty_bpm_bands: [30, 160, 200, 215] })).toBe(
      "ME003",
    );
    expect(
      await codeFor({ difficulty_bpm_bands: [100, 160, 200, 215, 250] }),
    ).toBe("ME003");
    expect(await codeFor({ beats_per_phrase: 17 })).toBe("23514");
    expect(await codeFor({ name: "" })).toBe("23514");
    expect(await codeFor({ slug: "Con Mayúsculas" })).toBe("23514");
  });

  test("el check de bandas vale también fuera de la función", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query(
            "update public.dance_styles set difficulty_bpm_bands = '{200,100}' where id = $1",
            [SALSA],
          ),
        ),
      ),
    ).toBe("23514");
  });

  test("slug repetido: 23505; posición inicial de otro estilo: 23503; inexistente: P0002", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) => save(tx, { slug: "merengue" })),
      ),
    ).toBe("23505");
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          save(tx, salsa({ start_position_id: MERENGUE_POS }), SALSA),
        ),
      ),
    ).toBe("23503");
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          save(tx, {}, "00000000-0000-4000-8000-000000000000"),
        ),
      ),
    ).toBe("P0002");
  });

  test("quitar la posición inicial de un estilo publicado: ME008", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          save(tx, salsa({ start_position_id: null }), SALSA),
        ),
      ),
    ).toBe("ME008");
  });
});

describe("borrar un estilo", () => {
  test("uno vacío y sin publicar se borra con sus posiciones", async () => {
    const left = await asUser(db, cesar, async (tx) => {
      const id = await save(tx, {}, null, { name: "Abrazo", slug: "abrazo" });
      await tx.query("delete from public.dance_styles where id = $1", [id]);
      return (
        await tx.query<{ n: number }>(
          "select count(*)::int as n from public.positions where style_id = $1",
          [id],
        )
      ).rows[0].n;
    });
    expect(left).toBe(0);
  });

  test("publicado: ME004", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query("delete from public.dance_styles where id = $1", [SALSA]),
        ),
      ),
    ).toBe("ME004");
  });

  test("sin publicar pero con pasos, canciones o curso: ME005 y no se borra nada", async () => {
    const result = await asUser(db, cesar, async (tx) => {
      await tx.query(
        "update public.dance_styles set published = false where id = $1",
        [SALSA],
      );
      const code = await codeOf(() =>
        tx.query("delete from public.dance_styles where id = $1", [SALSA]),
      );
      return { code };
    });
    expect(result.code).toBe("ME005");
    const steps = await asUser(
      db,
      cesar,
      async (tx) =>
        (
          await tx.query<{ n: number }>(
            "select count(*)::int as n from public.steps where style_id = $1",
            [SALSA],
          )
        ).rows[0].n,
    );
    expect(steps).toBeGreaterThan(0);
  });

  test("solo con pasos (sin canciones ni curso) también es ME005: la cascada nunca llega a los videos", async () => {
    const code = await asUser(db, cesar, async (tx) => {
      const id = await save(tx, {}, null, { name: "Abrazo", slug: "abrazo" });
      const pos = (await list(tx)).find((r) => r.id === id)
        ?.start_position_id as string;
      const step = (
        await tx.query<{ id: string }>(
          `insert into public.steps (style_id, slug, name, category, difficulty, start_position_id, end_position_id)
           values ($1, 'basico', 'Básico', 'base', 1, $2, $2) returning id`,
          [id, pos],
        )
      ).rows[0].id;
      await tx.query(
        "insert into public.step_videos (step_id, role, video_path) values ($1, 'both', 'x/both.mp4')",
        [step],
      );
      return codeOf(() =>
        tx.query("delete from public.dance_styles where id = $1", [id]),
      );
    });
    expect(code).toBe("ME005");
  });

  test("el seed y las migraciones (postgres) sí borran en cascada un estilo con pasos publicados", async () => {
    await db.transaction(async (tx) => {
      await tx.query("delete from public.dance_styles where id = $1", [
        MERENGUE,
      ]);
      const { rows } = await tx.query<{ n: number }>(
        "select count(*)::int as n from public.steps where style_id = $1",
        [MERENGUE],
      );
      expect(rows[0].n).toBe(0);
      await tx.rollback();
    });
  });
});

describe("posiciones", () => {
  test("el admin añade y renombra; una sin uso se borra", async () => {
    const result = await asUser(db, cesar, async (tx) => {
      const id = (
        await tx.query<{ id: string }>(
          "insert into public.positions (style_id, slug, name) values ($1, 'paseo', 'Paseo') returning id",
          [SALSA],
        )
      ).rows[0].id;
      await tx.query(
        "update public.positions set name = 'Paseo largo' where id = $1",
        [id],
      );
      const renamed = (await list(tx))[0].positions.find((p) => p.id === id);
      await tx.query("delete from public.positions where id = $1", [id]);
      const after = (await list(tx))[0].positions.some((p) => p.id === id);
      return { renamed, after };
    });
    expect(result.renamed).toMatchObject({
      name: "Paseo largo",
      step_count: 0,
    });
    expect(result.after).toBe(false);
  });

  test("una que usan pasos: ME006; la inicial: ME007", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query("delete from public.positions where id = $1", [CERRADA_POS]),
        ),
      ),
    ).toBe("ME006");
    const code = await asUser(db, cesar, async (tx) => {
      const id = await save(tx, {}, null, { name: "Abrazo", slug: "abrazo" });
      const pos = (await list(tx)).find((r) => r.id === id)
        ?.start_position_id as string;
      return codeOf(() =>
        tx.query("delete from public.positions where id = $1", [pos]),
      );
    });
    expect(code).toBe("ME007");
    // GUAPEA es la inicial de salsa y además la usan pasos: manda "en uso".
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query("delete from public.positions where id = $1", [GUAPEA_POS]),
        ),
      ),
    ).toBe("ME006");
  });
});
