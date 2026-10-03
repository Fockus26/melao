// Admin · Pasos (20261003120000_admin_steps.sql, D149–D153) contra PGlite con el seed: límites de
// los buckets, guardar con prerequisitos, publicar solo con video completo, borrar solo
// borradores sin lecciones, y las lecturas `admin_steps` / `admin_step_issues`.
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import {
  type AdminBucket,
  bucketMimeTypes,
  UPLOAD_MAX_BYTES,
} from "@/lib/admin/storage";
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
const GUAPEA = "b1000000-0000-4000-8000-000000000001"; // publicado, en una lección
const BASICO_CERRADA = "b1000000-0000-4000-8000-000000000002";

let db: PGlite;
let ana: string; // alumna
let cesar: string; // admin

const fields = (over: Record<string, unknown> = {}) => ({
  slug: "giro-nuevo",
  name: "Giro nuevo",
  description: "  Un giro de prueba.  ",
  beat_notes: [{ beat: 1, note: "Prepara" }],
  category: "vuelta",
  difficulty: 2,
  start_position_id: GUAPEA_POS,
  end_position_id: CERRADA_POS,
  phrases: 2,
  can_start: true,
  can_end: false,
  repeatable: false,
  variation_of: null,
  sort_order: 40,
  ...over,
});

const save = async (
  tx: Transaction,
  over: Record<string, unknown> = {},
  prereqs: string[] = [],
  id: string | null = null,
  style = SALSA,
) =>
  (
    await tx.query<{ id: string }>(
      "select public.admin_save_step($1, $2, $3, $4) as id",
      [id, style, JSON.stringify(fields(over)), prereqs],
    )
  ).rows[0].id;

const video = (tx: Transaction, step: string, role: string) =>
  tx.query(
    "insert into public.step_videos (step_id, role, video_path, duration_ms) values ($1, $2::public.video_role, $3, 4200)",
    [step, role, `${step}/${role}-1.mp4`],
  );

const publish = (tx: Transaction, step: string, on = true) =>
  tx.query("update public.steps set published = $2 where id = $1", [step, on]);

const issues = async (tx: Transaction, step: string) =>
  (
    await tx.query<{ issues: string[] | null }>(
      "select public.admin_step_issues($1) as issues",
      [step],
    )
  ).rows[0].issues;

type ListRow = {
  id: string;
  slug: string;
  published: boolean;
  videos_complete: boolean;
  has_voice_clip: boolean;
  lesson_count: number;
};
const list = async (tx: Transaction, style = SALSA) =>
  (await tx.query<ListRow>("select * from public.admin_steps($1)", [style]))
    .rows;

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

describe("Storage: límites de los buckets", () => {
  test("50 MB y los tipos de lib/admin/storage.ts en cada bucket", async () => {
    const { rows } = await db.query<{
      id: AdminBucket;
      file_size_limit: string;
      allowed_mime_types: string[];
    }>(
      "select id, file_size_limit, allowed_mime_types from storage.buckets order by id",
    );
    expect(rows.map((r) => r.id)).toEqual([
      "song-licenses",
      "songs",
      "step-videos",
      "voice-clips",
    ]);
    for (const row of rows) {
      expect(Number(row.file_size_limit)).toBe(UPLOAD_MAX_BYTES);
      expect([...row.allowed_mime_types].sort()).toEqual(
        bucketMimeTypes(row.id).sort(),
      );
    }
  });
});

describe("admin_save_step", () => {
  test("crea un borrador con sus prerequisitos y lo edita", async () => {
    const result = await asUser(db, cesar, async (tx) => {
      const id = await save(tx, {}, [GUAPEA]);
      const created = (
        await tx.query<{
          published: boolean;
          description: string;
          phrases: number;
        }>(
          "select published, description, phrases from public.steps where id = $1",
          [id],
        )
      ).rows[0];
      const edited = await save(
        tx,
        { name: "Giro editado", phrases: 3 },
        [BASICO_CERRADA],
        id,
      );
      const after = (
        await tx.query<{ name: string; phrases: number }>(
          "select name, phrases from public.steps where id = $1",
          [id],
        )
      ).rows[0];
      const prereqs = (
        await tx.query<{ r: string }>(
          "select requires_step_id as r from public.step_prerequisites where step_id = $1",
          [id],
        )
      ).rows.map((r) => r.r);
      return { id, created, edited, after, prereqs };
    });
    expect(result.created).toMatchObject({
      published: false,
      description: "Un giro de prueba.",
      phrases: 2,
    });
    expect(result.edited).toBe(result.id);
    expect(result.after).toEqual({ name: "Giro editado", phrases: 3 });
    expect(result.prereqs).toEqual([BASICO_CERRADA]);
  });

  test("la alumna no guarda (42501) y el anónimo no puede llamarla", async () => {
    expect(await codeOf(() => asUser(db, ana, (tx) => save(tx)))).toBe("42501");
    await expect(asAnon(db, (tx) => save(tx))).rejects.toThrow(
      /permission denied/,
    );
  });

  test("slug repetido en el estilo: 23505; en otro estilo, sí", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) => save(tx, { slug: "guapea" })),
      ),
    ).toBe("23505");
    const id = await asUser(db, cesar, (tx) =>
      save(
        tx,
        {
          slug: "guapea",
          start_position_id: MERENGUE_POS,
          end_position_id: MERENGUE_POS,
        },
        [],
        null,
        MERENGUE,
      ),
    );
    expect(id).toBeString();
  });

  test("posición de otro estilo: 23503; paso inexistente: P0002", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) => save(tx, { end_position_id: MERENGUE_POS })),
      ),
    ).toBe("23503");
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          save(tx, {}, [], "00000000-0000-4000-8000-000000000000"),
        ),
      ),
    ).toBe("P0002");
  });

  test("prerequisitos: círculo directo MS002, otro estilo MS003", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) => {
          const id = await save(tx, {}, [GUAPEA]);
          // guapea pasa a requerir el nuevo: A → B → A.
          await tx.query(
            "insert into public.step_prerequisites (step_id, requires_step_id) values ($1, $2)",
            [GUAPEA, id],
          );
        }),
      ),
    ).toBe("MS002");
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) => {
          const other = await save(
            tx,
            {
              slug: "merengue-x",
              start_position_id: MERENGUE_POS,
              end_position_id: MERENGUE_POS,
            },
            [],
            null,
            MERENGUE,
          );
          await save(tx, {}, [other]);
        }),
      ),
    ).toBe("MS003");
  });
});

describe("publicar exige video completo", () => {
  test("sin video, MS001; con líder y seguidor, se publica", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) => publish(tx, await save(tx))),
      ),
    ).toBe("MS001");
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) => {
          const id = await save(tx);
          await video(tx, id, "leader");
          await publish(tx, id);
        }),
      ),
    ).toBe("MS001");
    const published = await asUser(db, cesar, async (tx) => {
      const id = await save(tx);
      await video(tx, id, "leader");
      await video(tx, id, "follower");
      await publish(tx, id);
      return (
        await tx.query<{ published: boolean }>(
          "select published from public.steps where id = $1",
          [id],
        )
      ).rows[0].published;
    });
    expect(published).toBe(true);
  });

  test("un video para ambos roles basta; crear ya publicado sin video, no", async () => {
    const ok = await asUser(db, cesar, async (tx) => {
      const id = await save(tx, { category: "libre" });
      await video(tx, id, "both");
      await publish(tx, id);
      return true;
    });
    expect(ok).toBe(true);
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query(
            `insert into public.steps (style_id, slug, name, category, difficulty, start_position_id, end_position_id, published)
             values ($1, 'directo', 'Directo', 'figura', 1, $2, $2, true)`,
            [SALSA, GUAPEA_POS],
          ),
        ),
      ),
    ).toBe("MS001");
  });

  test("publicado: quitar un video o moverlo de paso, MS001; reemplazar el archivo, sí", async () => {
    const setup = async (tx: Transaction) => {
      const id = await save(tx);
      await video(tx, id, "leader");
      await video(tx, id, "follower");
      await publish(tx, id);
      return id;
    };
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) => {
          const id = await setup(tx);
          await tx.query(
            "delete from public.step_videos where step_id = $1 and role = 'follower'",
            [id],
          );
        }),
      ),
    ).toBe("MS001");
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) => {
          const id = await setup(tx);
          // Mover el video del seguidor a otro paso (rol o paso cambiado).
          const other = await save(tx, { slug: "otro" });
          await tx.query(
            "update public.step_videos set step_id = $2 where step_id = $1 and role = 'follower'",
            [id, other],
          );
        }),
      ),
    ).toBe("MS001");
    const replaced = await asUser(db, cesar, async (tx) => {
      const id = await setup(tx);
      const r = await tx.query(
        "update public.step_videos set video_path = 'nuevo.mp4' where step_id = $1 and role = 'leader'",
        [id],
      );
      // Despublicado, ya se puede quitar.
      await publish(tx, id, false);
      await tx.query("delete from public.step_videos where step_id = $1", [id]);
      return r.affectedRows;
    });
    expect(replaced).toBe(1);
  });

  test("los pasos del seed siguen publicados sin video (no se revalidan)", async () => {
    const n = await asUser(db, cesar, async (tx) => {
      const r = await tx.query(
        "update public.steps set name = 'Guapea' where id = $1",
        [GUAPEA],
      );
      return r.affectedRows;
    });
    expect(n).toBe(1);
  });
});

describe("borrar un paso", () => {
  test("publicado MS004; en una lección MS005; borrador libre, sí", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query("delete from public.steps where id = $1", [GUAPEA]),
        ),
      ),
    ).toBe("MS004");
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) => {
          await publish(tx, GUAPEA, false);
          await tx.query("delete from public.steps where id = $1", [GUAPEA]);
        }),
      ),
    ).toBe("MS005");
    const deleted = await asUser(db, cesar, async (tx) => {
      const id = await save(tx);
      await video(tx, id, "leader");
      return (await tx.query("delete from public.steps where id = $1", [id]))
        .affectedRows;
    });
    expect(deleted).toBe(1);
  });
});

describe("lecturas del editor", () => {
  test("admin_steps: todos los pasos del estilo con video, clip y lecciones", async () => {
    const rows = await asUser(db, cesar, async (tx) => {
      const id = await save(tx);
      await video(tx, id, "both");
      await tx.query(
        "update public.steps set voice_clip_path = 'steps/x.m4a' where id = $1",
        [id],
      );
      return list(tx);
    });
    const draft = rows.find((r) => r.slug === "giro-nuevo");
    expect(draft).toMatchObject({
      published: false,
      videos_complete: true,
      has_voice_clip: true,
      lesson_count: 0,
    });
    const guapea = rows.find((r) => r.id === GUAPEA);
    expect(guapea).toMatchObject({ published: true, videos_complete: false });
    expect(guapea?.lesson_count).toBeGreaterThan(0);
  });

  test("admin_steps y admin_step_issues: nada para la alumna, que tampoco ve borradores", async () => {
    const seen = await asUser(db, ana, async (tx) => ({
      list: await list(tx),
      issues: await issues(tx, GUAPEA),
    }));
    expect(seen).toEqual({ list: [], issues: null });
    const drafts = await asUser(db, cesar, async (tx) => {
      await save(tx);
      // La alumna en la misma base no vería el borrador: RLS de `steps`.
      await tx.exec(
        `select set_config('request.jwt.claim.sub', '${ana}', true)`,
      );
      return (await tx.query("select id from public.steps where not published"))
        .rows.length;
    });
    expect(drafts).toBe(0);
  });

  test("admin_step_issues: los videos que faltan según roles y categoría", async () => {
    const result = await asUser(db, cesar, async (tx) => {
      const id = await save(tx);
      const none = await issues(tx, id);
      await video(tx, id, "follower");
      const leaderOnly = await issues(tx, id);
      await video(tx, id, "leader");
      const complete = await issues(tx, id);
      const free = await save(tx, { slug: "libre-x", category: "libre" });
      return {
        none,
        leaderOnly,
        complete,
        free: await issues(tx, free),
      };
    });
    expect(result).toEqual({
      none: ["missing_video_leader", "missing_video_follower"],
      leaderOnly: ["missing_video_leader"],
      complete: [],
      free: ["missing_video_both"],
    });
  });
});
