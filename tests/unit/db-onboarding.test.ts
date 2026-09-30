// Bienvenida (20260929200000_onboarding.sql, D080–D083): complete_onboarding y user_styles.
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { applySeed, asAnon, asUser, createDb, createUser } from "../db/harness";

const SALSA = "a0000000-0000-4000-8000-000000000001";
const MERENGUE = "a0000000-0000-4000-8000-000000000002";
const BACHATA = "a0000000-0000-4000-8000-0000000000b1"; // sin publicar

let db: PGlite;
let ana: string;
let beto: string;
let cesar: string; // admin

const complete = (
  tx: Transaction,
  styles: string[],
  role = "leader",
  level = "beginner",
) =>
  tx.query(
    "select public.complete_onboarding($1::uuid[], $2::public.dance_role, $3::public.experience_level)",
    [styles, role, level],
  );

type Profile = {
  dance_role: string | null;
  experience_level: string | null;
  default_style_id: string | null;
  onboarded: boolean;
};

const profile = async (tx: Transaction, id: string) =>
  (
    await tx.query<Profile>(
      `select dance_role, experience_level, default_style_id,
              onboarded_at is not null as onboarded
         from public.profiles where id = $1`,
      [id],
    )
  ).rows[0];

const styles = async (tx: Transaction, id: string) =>
  (
    await tx.query<{ style_id: string }>(
      "select style_id from public.user_styles where user_id = $1 order by style_id",
      [id],
    )
  ).rows.map((r) => r.style_id);

beforeAll(async () => {
  db = await createDb();
  await applySeed(db);
  await db.query(
    `insert into public.dance_styles (id, slug, name, spoken_beats, published, sort_order)
     values ($1, 'bachata', 'Bachata', '{1,2,3,5,6,7}', false, 3)`,
    [BACHATA],
  );
  ana = await createUser(db, "ana@example.com");
  beto = await createUser(db, "beto@example.com");
  cesar = await createUser(db, "cesar@example.com");
  await db.query(
    "update public.profiles set app_role = 'admin' where id = $1",
    [cesar],
  );
}, 30_000);

describe("complete_onboarding", () => {
  test("guarda estilos, rol, nivel, estilo por defecto y onboarded_at", async () => {
    const result = await asUser(db, ana, async (tx) => {
      // Merengue primero en el arreglo: el estilo por defecto sale del sort_order, no del orden.
      await complete(tx, [MERENGUE, SALSA], "follower", "knows_steps");
      return { profile: await profile(tx, ana), styles: await styles(tx, ana) };
    });
    expect(result.profile).toEqual({
      dance_role: "follower",
      experience_level: "knows_steps",
      default_style_id: SALSA,
      onboarded: true,
    });
    expect(result.styles).toEqual([SALSA, MERENGUE]);
  });

  test("es idempotente: repetirla reescribe los estilos y el resto", async () => {
    const result = await asUser(db, ana, async (tx) => {
      await complete(tx, [SALSA, MERENGUE, SALSA]);
      await complete(tx, [MERENGUE], "leader", "beginner");
      await complete(tx, [MERENGUE], "leader", "beginner");
      return { profile: await profile(tx, ana), styles: await styles(tx, ana) };
    });
    expect(result.styles).toEqual([MERENGUE]);
    expect(result.profile).toEqual({
      dance_role: "leader",
      experience_level: "beginner",
      default_style_id: MERENGUE,
      onboarded: true,
    });
  });

  test("conserva el estilo por defecto si sigue entre los elegidos", async () => {
    const def = await asUser(db, ana, async (tx) => {
      await tx.query(
        "update public.profiles set default_style_id = $1 where id = $2",
        [MERENGUE, ana],
      );
      await complete(tx, [SALSA, MERENGUE]);
      return (await profile(tx, ana)).default_style_id;
    });
    expect(def).toBe(MERENGUE);
  });

  test("sin sesión: error", async () => {
    await expect(
      asUser(db, "", async (tx) => complete(tx, [SALSA])),
    ).rejects.toThrow();
    await expect(
      asAnon(db, async (tx) => complete(tx, [SALSA])),
    ).rejects.toThrow(/permission denied/);
  });

  test("cero estilos: error", async () => {
    await expect(
      asUser(db, ana, async (tx) => complete(tx, [])),
    ).rejects.toThrow(/al menos un estilo/);
  });

  test("estilo sin publicar o inexistente: error y nada cambia", async () => {
    await expect(
      asUser(db, ana, async (tx) => complete(tx, [SALSA, BACHATA])),
    ).rejects.toThrow(/no disponible/);
    await expect(
      asUser(db, ana, async (tx) =>
        complete(tx, ["a0000000-0000-4000-8000-0000000000ff"]),
      ),
    ).rejects.toThrow(/no disponible/);
    const onboarded = await asUser(
      db,
      ana,
      async (tx) => (await profile(tx, ana)).onboarded,
    );
    expect(onboarded).toBe(false);
  });

  test("rol o nivel nulos: error", async () => {
    await expect(
      asUser(db, ana, async (tx) =>
        tx.query(
          "select public.complete_onboarding($1::uuid[], null, 'beginner')",
          [[SALSA]],
        ),
      ),
    ).rejects.toThrow(/rol o el nivel/);
  });
});

describe("user_styles", () => {
  beforeAll(async () => {
    // Estado persistente (fuera de `as`, que revierte): ana y beto ya pasaron la Bienvenida.
    for (const [uid, style] of [
      [ana, SALSA],
      [beto, MERENGUE],
    ]) {
      await db.transaction(async (tx) => {
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
          uid,
        ]);
        await tx.exec("set local role authenticated");
        await complete(tx, [style]);
      });
    }
  });

  test("cada alumno lee solo los suyos", async () => {
    const rows = await asUser(
      db,
      ana,
      async (tx) =>
        (await tx.query("select user_id, style_id from public.user_styles"))
          .rows,
    );
    expect(rows).toEqual([{ user_id: ana, style_id: SALSA }]);
  });

  test("un admin lee todos", async () => {
    const n = await asUser(
      db,
      cesar,
      async (tx) =>
        (await tx.query("select 1 from public.user_styles")).rows.length,
    );
    expect(n).toBe(2);
  });

  test("anon no lee", async () => {
    await expect(
      asAnon(db, async (tx) => tx.query("select 1 from public.user_styles")),
    ).rejects.toThrow(/permission denied/);
  });

  test("nadie escribe directo: ni insert, ni update, ni delete", async () => {
    for (const sql of [
      `insert into public.user_styles (user_id, style_id) values ('${ana}', '${MERENGUE}')`,
      `update public.user_styles set created_at = now() where user_id = '${ana}'`,
      `delete from public.user_styles where user_id = '${ana}'`,
    ]) {
      await expect(
        asUser(db, ana, async (tx) => tx.query(sql)),
      ).rejects.toThrow(/permission denied/);
    }
  });

  test("experience_level no se edita con un update directo", async () => {
    await expect(
      asUser(db, ana, async (tx) =>
        tx.query(
          "update public.profiles set experience_level = 'knows_steps' where id = $1",
          [ana],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

// 20260930100000_onboarded_at_grant.sql: onboarded_at sale del permiso de columna.
describe("permisos de columna de profiles", () => {
  test("el alumno no se marca la Bienvenida con un update directo", async () => {
    await expect(
      asUser(db, beto, async (tx) =>
        tx.query(
          "update public.profiles set onboarded_at = now() where id = $1",
          [beto],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  test("ni un admin escribe onboarded_at directo", async () => {
    await expect(
      asUser(db, cesar, async (tx) =>
        tx.query(
          "update public.profiles set onboarded_at = null where id = $1",
          [ana],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  test("sigue editando display_name y default_style_id", async () => {
    const row = await asUser(db, beto, async (tx) => {
      await tx.query(
        "update public.profiles set display_name = 'Beto R.', default_style_id = $1 where id = $2",
        [SALSA, beto],
      );
      return (
        await tx.query<{ display_name: string; default_style_id: string }>(
          "select display_name, default_style_id from public.profiles where id = $1",
          [beto],
        )
      ).rows[0];
    });
    expect(row).toEqual({ display_name: "Beto R.", default_style_id: SALSA });
  });

  test("complete_onboarding sigue marcando onboarded_at", async () => {
    const onboarded = await asUser(db, cesar, async (tx) => {
      await complete(tx, [SALSA]);
      return (await profile(tx, cesar)).onboarded;
    });
    expect(onboarded).toBe(true);
  });
});
