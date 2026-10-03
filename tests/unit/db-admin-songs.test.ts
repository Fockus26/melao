// Admin · Canciones (20261003150000_admin_songs.sql, D158–D162) contra PGlite con el seed: quién
// ve y escribe, guardar con estilos, publicar solo con todo (códigos de `admin_song_issues` y
// error MS201), lo que una publicada no puede perder, borrar solo borradores sin lecciones, la
// lista `admin_songs` y el Resumen con la regla de video de `private.step_videos_complete`.
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
const SONG_1 = "c0000000-0000-4000-8000-000000000001"; // práctica y final de lecciones de salsa
const SONG_5 = "c0000000-0000-4000-8000-000000000005"; // merengue; con rejilla en el seed

let db: PGlite;
let ana: string; // alumna
let cesar: string; // admin

const fields = (over: Record<string, unknown> = {}) => ({
  title: "  Tema de prueba  ",
  artist: "Conjunto de ejemplo",
  difficulty_override: null,
  license_source: "Permiso escrito del sello (prueba)",
  license_notes: "",
  license_expires_at: "",
  ...over,
});

const save = async (
  tx: Transaction,
  over: Record<string, unknown> = {},
  styles: string[] = [SALSA],
  id: string | null = null,
) =>
  (
    await tx.query<{ id: string }>(
      "select public.admin_save_song($1, $2, $3) as id",
      [id, JSON.stringify(fields(over)), styles],
    )
  ).rows[0].id;

const issues = async (tx: Transaction, song: string) =>
  (
    await tx.query<{ issues: string[] | null }>(
      "select public.admin_song_issues($1) as issues",
      [song],
    )
  ).rows[0].issues;

/** Lo que el panel sube al momento: audio con duración y documento de la licencia. */
const attachFiles = (tx: Transaction, song: string) =>
  tx.query(
    `update public.songs set audio_path = 'nuevo/' || id || '.mp3', duration_ms = 200000,
       license_document_path = 'licencias/' || id || '.pdf'
     where id = $1`,
    [song],
  );

const publish = (tx: Transaction, song: string, on = true) =>
  tx.query("update public.songs set published = $2 where id = $1", [song, on]);

/** Código SQLSTATE (y detalle) del error de `sql`, sin abortar la transacción. */
async function errorOf(
  tx: Transaction,
  sql: string,
  params: unknown[] = [],
): Promise<{ code?: string; detail?: string } | undefined> {
  await tx.exec("savepoint probe");
  try {
    await tx.query(sql, params);
    await tx.exec("release savepoint probe");
    return undefined;
  } catch (error) {
    await tx.exec("rollback to savepoint probe");
    const e = error as { code?: string; detail?: string };
    return { code: e.code, detail: e.detail };
  }
}

type ListRow = {
  id: string;
  title: string;
  published: boolean;
  style_slugs: string[];
  ready: boolean;
  has_audio: boolean;
  license_status: string;
  lesson_count: number;
  difficulty_override: number | null;
  auto_difficulty: number | null;
  difficulty: number | null;
};
const list = async (tx: Transaction) =>
  (await tx.query<ListRow>("select * from public.admin_songs()")).rows;

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

describe("quién", () => {
  test("anónimo no llama a las funciones", async () => {
    const code = await asAnon(
      db,
      async (tx) =>
        (await errorOf(tx, "select * from public.admin_songs()"))?.code,
    );
    expect(code).toBe("42501");
  });

  test("una alumna no ve borradores, no lista ni escribe", async () => {
    await asUser(db, ana, async (tx) => {
      expect((await tx.query("select id from public.songs")).rows).toHaveLength(
        0,
      );
      expect(await list(tx)).toHaveLength(0);
      expect(await issues(tx, SONG_5)).toBeNull();
      expect(
        (
          await errorOf(tx, "select public.admin_save_song(null, $1, $2)", [
            JSON.stringify(fields()),
            [SALSA],
          ])
        )?.code,
      ).toBe("42501");
      // La RLS no deja tocar la fila (0 filas actualizadas).
      const updated = await tx.query(
        "update public.songs set title = 'x' where id = $1",
        [SONG_5],
      );
      expect(updated.affectedRows ?? 0).toBe(0);
    });
  });
});

describe("admin_songs", () => {
  test("todas, por título, con estilos, lecciones, licencia y dificultad", async () => {
    await asUser(db, cesar, async (tx) => {
      const rows = await list(tx);
      expect(rows).toHaveLength(5);
      expect(rows.map((r) => r.title)).toEqual(
        [...rows.map((r) => r.title)].sort((a, b) => (a < b ? -1 : 1)),
      );
      const one = rows.find((r) => r.id === SONG_1);
      expect(one).toMatchObject({
        published: false,
        style_slugs: ["salsa-casino"],
        // El seed no trae audio: con rejilla y fin de baile, pero sin preparar.
        ready: false,
        has_audio: false,
        license_status: "ok",
      });
      expect(one?.lesson_count).toBeGreaterThan(0);
      expect(rows.find((r) => r.id === SONG_5)?.lesson_count).toBeGreaterThan(
        0,
      );
      // Automática por las bandas del estilo (el seed las trae); sin override, la efectiva.
      expect(one?.auto_difficulty).not.toBeNull();
      expect(one?.difficulty).toBe(one?.auto_difficulty ?? -1);
    });
  });

  test("override manda; licencia vencida y por vencer; sin estilo; preparada con audio", async () => {
    await asUser(db, cesar, async (tx) => {
      await tx.query(
        "update public.songs set difficulty_override = 5, license_expires_at = current_date - 1 where id = $1",
        [SONG_1],
      );
      await tx.query(
        "update public.songs set license_expires_at = current_date + 30 where id = $1",
        [SONG_5],
      );
      await attachFiles(tx, SONG_5);
      const id = await save(tx, {}, []);
      const rows = await list(tx);
      const one = rows.find((r) => r.id === SONG_1);
      expect(one?.difficulty).toBe(5);
      expect(one?.license_status).toBe("expired");
      expect(rows.find((r) => r.id === SONG_5)).toMatchObject({
        license_status: "expiring",
        ready: true,
      });
      expect(rows.find((r) => r.id === id)).toMatchObject({
        style_slugs: [],
        lesson_count: 0,
        auto_difficulty: null,
        difficulty: null,
        ready: false,
      });
    });
  });
});

describe("admin_save_song", () => {
  test("crea sin publicar, con texto recortado y estilos; edita y reemplaza los estilos", async () => {
    await asUser(db, cesar, async (tx) => {
      const id = await save(tx, { license_expires_at: "2027-03-01" }, [
        SALSA,
        MERENGUE,
      ]);
      const { rows } = await tx.query<{
        title: string;
        published: boolean;
        license_notes: string | null;
        license_expires_at: Date | string;
      }>("select * from public.songs where id = $1", [id]);
      expect(rows[0].title).toBe("Tema de prueba");
      expect(rows[0].published).toBe(false);
      expect(rows[0].license_notes).toBeNull();
      expect(String(rows[0].license_expires_at)).toMatch(/2027/);
      const styles = async () =>
        (
          await tx.query<{ style_id: string }>(
            "select style_id from public.song_styles where song_id = $1 order by style_id",
            [id],
          )
        ).rows.map((r) => r.style_id);
      expect(await styles()).toEqual([SALSA, MERENGUE]);

      await save(
        tx,
        { title: "Otro título", difficulty_override: 3 },
        [MERENGUE],
        id,
      );
      expect(await styles()).toEqual([MERENGUE]);
      const after = await tx.query<{
        title: string;
        difficulty_override: number;
      }>("select title, difficulty_override from public.songs where id = $1", [
        id,
      ]);
      expect(after.rows[0]).toMatchObject({
        title: "Otro título",
        difficulty_override: 3,
      });
    });
  });

  test("canción inexistente → P0002; campo fuera de rango → 23514; todo o nada", async () => {
    await asUser(db, cesar, async (tx) => {
      expect(
        (
          await errorOf(tx, "select public.admin_save_song($1, $2, $3)", [
            "00000000-0000-4000-8000-000000000000",
            JSON.stringify(fields()),
            [SALSA],
          ])
        )?.code,
      ).toBe("P0002");
      expect(
        (
          await errorOf(tx, "select public.admin_save_song($1, $2, $3)", [
            SONG_5,
            JSON.stringify(fields({ difficulty_override: 9 })),
            [SALSA],
          ])
        )?.code,
      ).toBe("23514");
      // El fallo no dejó los estilos a medias.
      const { rows } = await tx.query<{ style_id: string }>(
        "select style_id from public.song_styles where song_id = $1",
        [SONG_5],
      );
      expect(rows.map((r) => r.style_id)).toEqual([MERENGUE]);
    });
  });
});

describe("publicar", () => {
  test("canción nueva: todo lo que falta, en orden", async () => {
    await asUser(db, cesar, async (tx) => {
      const id = await save(tx, { license_source: "" }, []);
      expect(await issues(tx, id)).toEqual([
        "missing_audio",
        "missing_grid",
        "missing_dance_end",
        "missing_style",
        "missing_license_source",
        "missing_license_document",
      ]);
    });
  });

  test("sin rejilla → MS201 con los códigos; con todo, se publica", async () => {
    await asUser(db, cesar, async (tx) => {
      const id = await save(tx);
      await attachFiles(tx, id);
      expect(await issues(tx, id)).toEqual([
        "missing_grid",
        "missing_dance_end",
      ]);
      const err = await errorOf(
        tx,
        "update public.songs set published = true where id = $1",
        [id],
      );
      expect(err).toEqual({
        code: "MS201",
        detail: "missing_grid,missing_dance_end",
      });
    });
    // Con rejilla (seed) y licencia de la canción 5: se publica.
    await asUser(db, cesar, async (tx) => {
      await save(tx, { title: "Pista 5" }, [MERENGUE], SONG_5);
      await attachFiles(tx, SONG_5);
      expect(await issues(tx, SONG_5)).toEqual([]);
      await publish(tx, SONG_5);
      const { rows } = await tx.query<{ published: boolean }>(
        "select published from public.songs where id = $1",
        [SONG_5],
      );
      expect(rows[0].published).toBe(true);
    });
  });

  test("licencia vencida no se publica", async () => {
    await asUser(db, cesar, async (tx) => {
      await save(tx, { license_expires_at: "2020-01-01" }, [MERENGUE], SONG_5);
      await attachFiles(tx, SONG_5);
      expect(await issues(tx, SONG_5)).toEqual(["license_expired"]);
      expect(
        (
          await errorOf(
            tx,
            "update public.songs set published = true where id = $1",
            [SONG_5],
          )
        )?.code,
      ).toBe("MS201");
    });
  });

  test("publicada: no pierde audio, licencia ni su último estilo (MS202); cambiar de estilo sí", async () => {
    await asUser(db, cesar, async (tx) => {
      await save(tx, {}, [MERENGUE], SONG_5);
      await attachFiles(tx, SONG_5);
      await publish(tx, SONG_5);
      for (const sql of [
        "update public.songs set audio_path = null where id = $1",
        "update public.songs set license_document_path = null where id = $1",
        "delete from public.song_styles where song_id = $1",
      ])
        expect((await errorOf(tx, sql, [SONG_5]))?.code).toBe("MS202");
      expect(
        (
          await errorOf(tx, "select public.admin_save_song($1, $2, $3)", [
            SONG_5,
            JSON.stringify(fields({ license_source: "" })),
            [MERENGUE],
          ])
        )?.code,
      ).toBe("MS202");
      expect(
        (
          await errorOf(tx, "select public.admin_save_song($1, $2, $3)", [
            SONG_5,
            JSON.stringify(fields()),
            [],
          ])
        )?.code,
      ).toBe("MS202");
      // Reemplazar el único estilo por otro: nunca pasa por "sin estilos".
      await save(tx, {}, [SALSA], SONG_5);
      // Reemplazar el audio (otro objeto) y editar datos: sin revalidar.
      await tx.query(
        "update public.songs set audio_path = 'otro.mp3', title = 'Cambio' where id = $1",
        [SONG_5],
      );
      // Despublicar y luego quitar, sí.
      await publish(tx, SONG_5, false);
      await tx.query(
        "update public.songs set audio_path = null where id = $1",
        [SONG_5],
      );
    });
  });
});

describe("borrar", () => {
  test("borrador sin lecciones, sí; publicada → MS203; en una lección → MS204", async () => {
    await asUser(db, cesar, async (tx) => {
      expect(
        (await errorOf(tx, "delete from public.songs where id = $1", [SONG_1]))
          ?.code,
      ).toBe("MS204");
      const id = await save(tx);
      await tx.query("delete from public.songs where id = $1", [id]);
      const gone = await tx.query(
        "select 1 from public.song_styles where song_id = $1",
        [id],
      );
      expect(gone.rows).toHaveLength(0);

      await save(tx, {}, [MERENGUE], SONG_5);
      await attachFiles(tx, SONG_5);
      await publish(tx, SONG_5);
      expect(
        (await errorOf(tx, "delete from public.songs where id = $1", [SONG_5]))
          ?.code,
      ).toBe("MS203");
    });
  });
});

describe("Resumen con private.step_videos_complete", () => {
  test("la función usa la regla común y el resultado de los pasos no cambia", async () => {
    const def = (
      await db.query<{ def: string }>(
        "select pg_get_functiondef('public.admin_summary()'::regprocedure) as def",
      )
    ).rows[0].def;
    expect(def).toContain("private.step_videos_complete(st.id)");
    expect(def).not.toContain("v.role = 'both'");

    await asUser(db, cesar, async (tx) => {
      const summary = (
        await tx.query<{
          s: {
            warnings: { kind: string; id: string; reasons: string[] }[];
            pending: { kind: string; id: string; reasons: string[] }[];
          };
        }>("select public.admin_summary() as s")
      ).rows[0].s;
      // La regla de antes, escrita aquí: video `both`, o líder y seguidor.
      const { rows } = await tx.query<{
        id: string;
        published: boolean;
        complete: boolean;
      }>(
        `select st.id, st.published,
           exists (select 1 from public.step_videos v where v.step_id = st.id and v.role = 'both')
           or (exists (select 1 from public.step_videos v where v.step_id = st.id and v.role = 'leader')
               and exists (select 1 from public.step_videos v where v.step_id = st.id and v.role = 'follower'))
           as complete
         from public.steps st`,
      );
      for (const step of rows) {
        const items = step.published ? summary.warnings : summary.pending;
        const item = items.find((i) => i.kind === "step" && i.id === step.id);
        if (step.published) expect(Boolean(item)).toBe(!step.complete);
        else
          expect(item?.reasons).toEqual(step.complete ? [] : ["missing_video"]);
      }
    });
  });
});
