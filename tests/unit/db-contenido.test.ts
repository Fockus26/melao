import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite } from "@electric-sql/pglite";
import {
  asAnon,
  asUser,
  createDb,
  createUser,
  DB_BOOT_TIMEOUT_MS,
} from "../db/harness";

let db: PGlite;
let ana: string; // alumna sin suscripción (vitrina)
let beto: string; // alumno con suscripción
let cesar: string; // admin
const ids: Record<string, string> = {};

async function one(sql: string, params: unknown[] = []): Promise<string> {
  const { rows } = await db.query<{ id: string }>(sql, params);
  return rows[0].id;
}

beforeAll(async () => {
  db = await createDb();
  ana = await createUser(db, "ana@example.com");
  beto = await createUser(db, "beto@example.com");
  cesar = await createUser(db, "cesar@example.com");
  await db.query(
    "update public.profiles set app_role = 'admin' where id = $1",
    [cesar],
  );
  await db.query(
    `insert into public.subscriptions (user_id, plan_id, status, provider, current_period_end)
     select $1, id, 'active', 'placeholder', now() + interval '30 days' from public.plans where slug = 'basico'`,
    [beto],
  );

  // Salsa publicada con dos posiciones; merengue sin publicar.
  await db.exec("begin");
  ids.salsa = await one(
    `insert into public.dance_styles (slug, name, spoken_beats, published)
     values ('salsa-casino', 'Salsa casino', '{1,2,3,5,6,7}', false) returning id`,
  );
  ids.cerrada = await one(
    "insert into public.positions (style_id, slug, name) values ($1, 'cerrada', 'Cerrada') returning id",
    [ids.salsa],
  );
  ids.abierta = await one(
    "insert into public.positions (style_id, slug, name) values ($1, 'abierta', 'Abierta') returning id",
    [ids.salsa],
  );
  await db.query(
    "update public.dance_styles set start_position_id = $1, published = true where id = $2",
    [ids.cerrada, ids.salsa],
  );
  await db.exec("commit");
  ids.merengue = await one(
    `insert into public.dance_styles (slug, name, spoken_beats) values ('merengue', 'Merengue', '{1,2,3,4,5,6,7,8}') returning id`,
  );

  const step = (slug: string, published: boolean) =>
    one(
      `insert into public.steps (style_id, slug, name, category, difficulty, start_position_id, end_position_id, can_start, can_end, published)
       values ($1, $2, $2, 'figura', 2, $3, $4, true, true, $5) returning id`,
      [ids.salsa, slug, ids.cerrada, ids.abierta, published],
    );
  ids.enchufla = await step("enchufla", true);
  ids.borrador = await step("borrador", false);
  await db.query(
    "insert into public.step_prerequisites (step_id, requires_step_id) values ($1, $2)",
    [ids.enchufla, ids.borrador],
  );
  await db.query(
    "insert into public.step_videos (step_id, role, video_path) values ($1, 'leader', 'salsa/enchufla-leader.mp4'), ($2, 'leader', 'salsa/borrador.mp4')",
    [ids.enchufla, ids.borrador],
  );

  const song = (title: string, published: boolean, expires: string | null) =>
    one(
      `insert into public.songs (title, artist, audio_path, duration_ms, dance_end_ms, beat_grid, license_source, license_document_path, license_expires_at, published)
       values ($1, 'Artista', 'x.m4a', 300000, 290000, '[{"beat":0,"tMs":1750},{"beat":8,"tMs":4300}]', 'Permiso escrito', 'lic.pdf', $2, $3) returning id`,
      [title, expires, published],
    );
  ids.vigente = await song("Vigente", true, null);
  ids.vencida = await song("Vencida", true, "2000-01-01");
  ids.oculta = await song("Oculta", false, null);
  await db.query(
    "insert into public.song_styles (song_id, style_id) values ($1, $2), ($3, $2)",
    [ids.vigente, ids.salsa, ids.vencida],
  );

  ids.curso = await one(
    "insert into public.courses (style_id, title, published) values ($1, 'Salsa casino desde cero', true) returning id",
    [ids.salsa],
  );
  ids.unidad = await one(
    "insert into public.course_units (course_id, position, title) values ($1, 1, 'Unidad 1') returning id",
    [ids.curso],
  );
  ids.leccion = await one(
    "insert into public.lessons (unit_id, position, title, final_song_id) values ($1, 1, 'Lección 1', $2) returning id",
    [ids.unidad, ids.vigente],
  );
  await db.query(
    "insert into public.lesson_steps (lesson_id, step_id, position) values ($1, $2, 1)",
    [ids.leccion, ids.enchufla],
  );

  await db.query(
    "insert into storage.objects (bucket_id, name) values ('songs', 'x.m4a'), ('step-videos', 'salsa/enchufla-leader.mp4'), ('song-licenses', 'lic.pdf')",
  );
}, DB_BOOT_TIMEOUT_MS);

const names = (uid: string, sql: string) =>
  asUser(db, uid, async (tx) =>
    (await tx.query<{ n: string }>(sql)).rows.map((r) => r.n),
  );

describe("vitrina sin suscripción (D036)", () => {
  test("ve los estilos publicados, no los borradores", async () => {
    expect(
      await names(ana, "select slug as n from public.dance_styles"),
    ).toEqual(["salsa-casino"]);
  });

  test("ve los pasos publicados con sus posiciones y videos", async () => {
    expect(await names(ana, "select slug as n from public.steps")).toEqual([
      "enchufla",
    ]);
    expect(
      (await names(ana, "select slug as n from public.positions order by slug"))
        .length,
    ).toBe(2);
    expect(
      await names(ana, "select video_path as n from public.step_videos"),
    ).toEqual(["salsa/enchufla-leader.mp4"]);
  });

  test("las canciones sin publicar o con licencia vencida no aparecen", async () => {
    expect(await names(ana, "select title as n from public.songs")).toEqual([
      "Vigente",
    ]);
    expect(
      (await names(ana, "select song_id::text as n from public.song_styles"))
        .length,
    ).toBe(1);
  });

  test("ve el camino del curso publicado", async () => {
    expect(await names(ana, "select title as n from public.lessons")).toEqual([
      "Lección 1",
    ]);
    expect(
      (await names(ana, "select step_id::text as n from public.lesson_steps"))
        .length,
    ).toBe(1);
  });

  test("no descarga medios: Storage exige suscripción", async () => {
    expect(await names(ana, "select name as n from storage.objects")).toEqual(
      [],
    );
  });

  test("elige su estilo por defecto", async () => {
    const changed = await asUser(db, ana, async (tx) => {
      const r = await tx.query(
        "update public.profiles set default_style_id = $1 where id = $2",
        [ids.salsa, ana],
      );
      return r.affectedRows;
    });
    expect(changed).toBe(1);
  });
});

describe("con suscripción", () => {
  test("descarga canciones y videos, no los documentos de licencia", async () => {
    expect(
      await names(beto, "select name as n from storage.objects order by name"),
    ).toEqual(["salsa/enchufla-leader.mp4", "x.m4a"]);
  });
});

describe("anónimo", () => {
  test("no ve contenido", async () => {
    await expect(
      asAnon(db, (tx) => tx.query("select id from public.steps")),
    ).rejects.toThrow(/permission denied/);
    expect(
      await asAnon(
        db,
        async (tx) => (await tx.query("select name from storage.objects")).rows,
      ),
    ).toEqual([]);
  });
});

describe("admin", () => {
  test("ve borradores y licencias", async () => {
    expect(
      (await names(cesar, "select slug as n from public.steps")).sort(),
    ).toEqual(["borrador", "enchufla"]);
    expect(
      (await names(cesar, "select title as n from public.songs")).length,
    ).toBe(3);
    expect(
      (await names(cesar, "select name as n from storage.objects")).length,
    ).toBe(3);
  });

  test("crea y publica contenido", async () => {
    const n = await asUser(db, cesar, async (tx) => {
      // Publicar exige video de cada rol (20261003120000_admin_steps.sql): falta el seguidor.
      await tx.query(
        "insert into public.step_videos (step_id, role, video_path) values ($1, 'follower', 'salsa/borrador-follower.mp4')",
        [ids.borrador],
      );
      await tx.query("update public.steps set published = true where id = $1", [
        ids.borrador,
      ]);
      await tx.query(
        "insert into storage.objects (bucket_id, name) values ('voice-clips', 'step.enchufla.m4a')",
      );
      return (await tx.query("select id from public.steps where published"))
        .rows.length;
    });
    expect(n).toBe(2);
  });
});

describe("el alumno no escribe contenido", () => {
  test("ni pasos ni Storage", async () => {
    await expect(
      asUser(db, beto, (tx) =>
        tx.query(
          `insert into public.steps (style_id, slug, name, category, difficulty, start_position_id, end_position_id)
           values ($1, 'x', 'x', 'base', 1, $2, $2)`,
          [ids.salsa, ids.cerrada],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    const changed = await asUser(db, beto, async (tx) => {
      const r = await tx.query("update public.songs set title = 'hack'");
      return r.affectedRows;
    });
    expect(changed).toBe(0);
    await expect(
      asUser(db, beto, (tx) =>
        tx.query(
          "insert into storage.objects (bucket_id, name) values ('songs', 'mia.mp3')",
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("reglas del catálogo", () => {
  test("una canción sin licencia no se publica (D009)", async () => {
    await expect(
      db.query(
        `insert into public.songs (title, artist, audio_path, duration_ms, dance_end_ms, beat_grid, published)
         values ('Sin permiso', 'X', 'y.m4a', 200000, 190000, '[{"beat":0,"tMs":0},{"beat":8,"tMs":2600}]', true)`,
      ),
    ).rejects.toThrow(/songs_publish_requirements/);
  });

  test("las posiciones de un paso son de su mismo estilo", async () => {
    const otra = await one(
      "insert into public.positions (style_id, slug, name) values ($1, 'cerrada', 'Cerrada') returning id",
      [ids.merengue],
    );
    await expect(
      db.query(
        `insert into public.steps (style_id, slug, name, category, difficulty, start_position_id, end_position_id)
         values ($1, 'mezcla', 'Mezcla', 'base', 1, $2, $2)`,
        [ids.salsa, otra],
      ),
    ).rejects.toThrow(/foreign key/);
  });

  test("la cuenta del estilo es coherente", async () => {
    await expect(
      db.query(
        "insert into public.dance_styles (slug, name, spoken_beats) values ('mal', 'Mal', '{1,9}')",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.query(
        "insert into public.dance_styles (slug, name, spoken_beats, call_beat) values ('mal2', 'Mal', '{1}', 8)",
      ),
    ).rejects.toThrow(/check constraint/);
  });

  test("un estilo no se publica sin posición inicial", async () => {
    await expect(
      db.query(
        "update public.dance_styles set published = true where id = $1",
        [ids.merengue],
      ),
    ).rejects.toThrow(/dance_styles_published_needs_start/);
  });
});
