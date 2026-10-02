import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite } from "@electric-sql/pglite";
import {
  asAnon,
  asService,
  asUser,
  createDb,
  createUser,
  DB_BOOT_TIMEOUT_MS,
} from "../db/harness";

let db: PGlite;
let ana: string;
let beto: string;
let cesar: string;
const ids: Record<string, string> = {};

async function one(sql: string, params: unknown[] = []): Promise<string> {
  const { rows } = await db.query<{ id: string }>(sql, params);
  return rows[0].id;
}

async function session(
  user: string,
  song: string,
  daysAgo: number,
  steps: string[],
): Promise<string> {
  const id = await one(
    `insert into public.practice_sessions (user_id, style_id, song_id, mode, seed, phrases_available, plan, created_at)
     values ($1, $2, $3, 'free', 42, 12, '[]', now() - make_interval(days => $4)) returning id`,
    [user, ids.salsa, song, daysAgo],
  );
  for (const step of steps) {
    await db.query(
      "insert into public.practice_session_steps (session_id, step_id, phrases) values ($1, $2, 1)",
      [id, step],
    );
  }
  return id;
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

  await db.exec("begin");
  ids.salsa = await one(
    "insert into public.dance_styles (slug, name, spoken_beats) values ('salsa-casino', 'Salsa casino', '{1,2,3,5,6,7}') returning id",
  );
  ids.cerrada = await one(
    "insert into public.positions (style_id, slug, name) values ($1, 'cerrada', 'Cerrada') returning id",
    [ids.salsa],
  );
  await db.query(
    "update public.dance_styles set start_position_id = $1, published = true where id = $2",
    [ids.cerrada, ids.salsa],
  );
  await db.exec("commit");

  const step = (slug: string, published = true) =>
    one(
      `insert into public.steps (style_id, slug, name, category, difficulty, start_position_id, end_position_id, published)
       values ($1, $2, $2, 'figura', 2, $3, $3, $4) returning id`,
      [ids.salsa, slug, ids.cerrada, published],
    );
  ids.enchufla = await step("enchufla");
  ids.dile = await step("dile-que-no");
  ids.borrador = await step("borrador", false);

  const song = (title: string) =>
    one(
      `insert into public.songs (title, artist, audio_path, duration_ms, dance_end_ms, beat_grid, license_source, license_document_path, published)
       values ($1, 'Artista', 'x.m4a', 300000, 290000, '[{"beat":0,"tMs":0},{"beat":8,"tMs":2600}]', 'Permiso', 'lic.pdf', true) returning id`,
      [title],
    );
  ids.tu = await song("Tú con él");
  ids.otra = await song("Otra");

  ids.sesionAna = await session(ana, ids.tu, 1, [ids.enchufla, ids.dile]);
  await session(beto, ids.tu, 2, [ids.enchufla]);
  await session(beto, ids.otra, 40, [ids.dile]); // fuera de los 30 días

  await db.query(
    `insert into public.srs_cards (user_id, step_id, role, state, stability, difficulty, due_at)
     values ($1, $2, 'follower', 'review', 3.2, 6.1, now() - interval '1 day')`,
    [ana, ids.enchufla],
  );
  await db.query(
    `insert into public.step_reviews (user_id, step_id, role, rating, context, session_id)
     values ($1, $2, 'follower', 2, 'practice', $3)`,
    [ana, ids.enchufla, ids.sesionAna],
  );
}, DB_BOOT_TIMEOUT_MS);

const rows = (uid: string, sql: string, params: unknown[] = []) =>
  asUser(
    db,
    uid,
    async (tx) => (await tx.query<Record<string, unknown>>(sql, params)).rows,
  );

describe("cada alumno ve solo lo suyo", () => {
  test("tarjetas, repasos y sesiones", async () => {
    expect(
      (await rows(ana, "select step_id from public.srs_cards")).length,
    ).toBe(1);
    expect(
      (await rows(beto, "select step_id from public.srs_cards")).length,
    ).toBe(0);
    expect((await rows(ana, "select id from public.step_reviews")).length).toBe(
      1,
    );
    expect(
      (await rows(beto, "select id from public.step_reviews")).length,
    ).toBe(0);
    expect(
      (await rows(beto, "select id from public.practice_sessions")).length,
    ).toBe(2);
    expect(
      (await rows(beto, "select step_id from public.practice_session_steps"))
        .length,
    ).toBe(2);
  });

  test("'para hoy' = sus tarjetas vencidas", async () => {
    const due = await rows(
      ana,
      "select step_id from public.srs_cards where due_at <= now()",
    );
    expect(due).toEqual([{ step_id: ids.enchufla }]);
  });

  test("el admin ve todo", async () => {
    expect(
      (await rows(cesar, "select id from public.practice_sessions")).length,
    ).toBe(3);
  });

  test("anon no ve nada", async () => {
    await expect(
      asAnon(db, (tx) => tx.query("select * from public.srs_cards")),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("el cliente no escribe reglas de negocio (D003, D013)", () => {
  test("no crea ni edita tarjetas FSRS", async () => {
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          "insert into public.srs_cards (user_id, step_id, role) values ($1, $2, 'follower')",
          [ana, ids.dile],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          "update public.srs_cards set due_at = now() + interval '1 year'",
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  test("no registra repasos ni completa lecciones", async () => {
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          "insert into public.step_reviews (user_id, step_id, role, rating, context) values ($1, $2, 'follower', 4, 'catalog')",
          [ana, ids.dile],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          "insert into public.lesson_progress (user_id, lesson_id) values ($1, gen_random_uuid())",
          [ana],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  test("no cambia el estado de un paso ('me lo sé' pasa por review-steps)", async () => {
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          "insert into public.user_steps (user_id, step_id, status) values ($1, $2, 'known')",
          [ana, ids.dile],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  test("no crea sesiones ni altera su plan", async () => {
    await expect(
      asUser(db, ana, (tx) =>
        tx.query("update public.practice_sessions set plan = '[]', seed = 1"),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  test("service_role (Edge Functions) sí escribe", async () => {
    const n = await asService(db, async (tx) => {
      await tx.query(
        "insert into public.srs_cards (user_id, step_id, role) values ($1, $2, 'follower')",
        [ana, ids.dile],
      );
      await tx.query(
        "insert into public.user_steps (user_id, step_id, status) values ($1, $2, 'learning')",
        [ana, ids.dile],
      );
      return (
        await tx.query("select 1 from public.srs_cards where user_id = $1", [
          ana,
        ])
      ).rows.length;
    });
    expect(n).toBe(2);
  });

  test("un repaso por (sesión, paso, rol): idempotente", async () => {
    await expect(
      db.query(
        "insert into public.step_reviews (user_id, step_id, role, rating, context, session_id) values ($1, $2, 'follower', 3, 'practice', $3)",
        [ana, ids.enchufla, ids.sesionAna],
      ),
    ).rejects.toThrow(/step_reviews_session_id_step_id_role_key/);
  });
});

describe("lo que el cliente sí hace", () => {
  test("marca y desmarca un paso favorito", async () => {
    const fav = await asUser(db, ana, async (tx) => {
      await tx.query(
        "insert into public.user_steps (user_id, step_id, favorite) values ($1, $2, true)",
        [ana, ids.dile],
      );
      await tx.query(
        "update public.user_steps set favorite = false where step_id = $1",
        [ids.dile],
      );
      return (
        await tx.query<{ favorite: boolean }>(
          "select favorite from public.user_steps where step_id = $1",
          [ids.dile],
        )
      ).rows[0].favorite;
    });
    expect(fav).toBe(false);
  });

  test("no marca favorito un paso que no ve ni a nombre de otro", async () => {
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          "insert into public.user_steps (user_id, step_id, favorite) values ($1, $2, true)",
          [ana, ids.borrador],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          "insert into public.user_steps (user_id, step_id, favorite) values ($1, $2, true)",
          [beto, ids.dile],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  test("pone y quita canciones favoritas", async () => {
    const n = await asUser(db, ana, async (tx) => {
      await tx.query(
        "insert into public.user_song_favorites (user_id, song_id) values ($1, $2)",
        [ana, ids.tu],
      );
      const before = (
        await tx.query("select 1 from public.user_song_favorites")
      ).rows.length;
      await tx.query(
        "delete from public.user_song_favorites where song_id = $1",
        [ids.tu],
      );
      return (
        before -
        (await tx.query("select 1 from public.user_song_favorites")).rows.length
      );
    });
    expect(n).toBe(1);
  });

  test("cierra su sesión, no la de otro", async () => {
    const mine = await asUser(db, ana, async (tx) => {
      const r = await tx.query(
        "update public.practice_sessions set completed_at = now() where id = $1",
        [ids.sesionAna],
      );
      return r.affectedRows;
    });
    expect(mine).toBe(1);
    const others = await asUser(db, beto, async (tx) => {
      const r = await tx.query(
        "update public.practice_sessions set completed_at = now() where id = $1",
        [ids.sesionAna],
      );
      return r.affectedRows;
    });
    expect(others).toBe(0);
  });

  test("la marca de fin del cliente es idempotente y respeta created_at (D147)", async () => {
    const MARK =
      "update public.practice_sessions set completed_at = $2 where id = $1 and completed_at is null";
    const READ =
      "select created_at, completed_at from public.practice_sessions where id = $1";
    type Row = { created_at: Date; completed_at: Date | null };
    const { created, n1, n2, kept } = await asUser(db, ana, async (tx) => {
      const before = (await tx.query<Row>(READ, [ids.sesionAna])).rows[0];
      const at = new Date(before.created_at.getTime() + 60_000);
      const n1 = (await tx.query(MARK, [ids.sesionAna, at.toISOString()]))
        .affectedRows;
      // Otra vez (Terminar tras el fin, reintento): no cambia la primera hora.
      const n2 = (
        await tx.query(MARK, [
          ids.sesionAna,
          new Date(at.getTime() + 60_000).toISOString(),
        ])
      ).affectedRows;
      const after = (await tx.query<Row>(READ, [ids.sesionAna])).rows[0];
      return {
        created: before.created_at,
        n1,
        n2,
        kept: after.completed_at?.getTime() === at.getTime(),
      };
    });
    expect([n1, n2, kept]).toEqual([1, 0, true]);

    // Reloj del dispositivo atrasado: el check lo rechaza (23514)…
    let code: string | undefined;
    try {
      await asUser(db, ana, (tx) =>
        tx.query(MARK, [ids.sesionAna, "2000-01-01T00:00:00Z"]),
      );
    } catch (e) {
      code = (e as { code?: string }).code;
    }
    expect(code).toBe("23514");
    // …y con created_at (lo que hace el cliente al reintentar) entra.
    const n = await asUser(
      db,
      ana,
      async (tx) =>
        (await tx.query(MARK, [ids.sesionAna, created.toISOString()]))
          .affectedRows,
    );
    expect(n).toBe(1);
  });
});

describe("popularidad (últimos 30 días)", () => {
  test("canciones: cuenta sesiones de todos, sin datos personales", async () => {
    const pop = await rows(
      ana,
      "select song_id, sessions_30d from public.song_popularity() order by sessions_30d desc",
    );
    expect(pop).toEqual([
      { song_id: ids.tu, sessions_30d: 2 },
      { song_id: ids.otra, sessions_30d: 0 },
    ]);
  });

  test("pasos: apariciones recientes; los viejos cuentan 0; sin borradores", async () => {
    const pop = await rows(
      ana,
      "select step_id, appearances_30d from public.step_popularity($1) order by appearances_30d desc",
      [ids.salsa],
    );
    expect(pop).toEqual([
      { step_id: ids.enchufla, appearances_30d: 2 },
      { step_id: ids.dile, appearances_30d: 1 },
    ]);
  });

  test("anon no la consulta", async () => {
    await expect(
      asAnon(db, (tx) => tx.query("select * from public.song_popularity()")),
    ).rejects.toThrow(/permission denied/);
  });
});
