// Inicio y Curso (20260930120000_course_path.sql, D092–D093): course_path, style_progress,
// due_steps, hardest_steps y private.lesson_unlocked, contra PGlite con el seed.
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { applySeed, asAnon, createDb, createUser } from "../db/harness";

const SALSA = "a0000000-0000-4000-8000-000000000001";
const MERENGUE = "a0000000-0000-4000-8000-000000000002";
const RUEDA = "a0000000-0000-4000-8000-0000000000c1"; // sin roles (creado aquí)
const SALSA_COURSE = "d0000000-0000-4000-8000-000000000001";
const L = {
  s1: "d2000000-0000-4000-8000-000000000111",
  s2: "d2000000-0000-4000-8000-000000000112",
  s3: "d2000000-0000-4000-8000-000000000113",
  s4: "d2000000-0000-4000-8000-000000000121",
  s5: "d2000000-0000-4000-8000-000000000122",
  s6: "d2000000-0000-4000-8000-000000000123",
};
const GUAPEA = "b1000000-0000-4000-8000-000000000001";
const DILE_QUE_SI = "b1000000-0000-4000-8000-000000000003";
const ENCHUFLA = "b1000000-0000-4000-8000-000000000007";
const SETENTA = "b1000000-0000-4000-8000-000000000014";
const BASICO_MERENGUE = "b2000000-0000-4000-8000-000000000001";
const RUEDA_STEP = "b3000000-0000-4000-8000-000000000001";

let db: PGlite;
let ana: string; // líder
let beto: string; // seguidor
let cesar: string; // admin

/**
 * Prepara datos como superusuario y consulta como el alumno, en una transacción que siempre se
 * revierte (cada test parte de la base del `beforeAll`).
 */
async function withData<T>(
  uid: string,
  setup: (tx: Transaction) => Promise<unknown>,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  let failure: unknown;
  await db
    .transaction(async (tx) => {
      await setup(tx);
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
        uid,
      ]);
      await tx.exec("set local role authenticated");
      try {
        result = await fn(tx);
      } catch (error) {
        failure = error;
      }
      await tx.rollback();
    })
    .catch(() => {});
  if (failure) throw failure;
  return result as T;
}

const none = async () => {};

const complete = (tx: Transaction, user: string, lessons: string[]) =>
  tx.query(
    "insert into public.lesson_progress (user_id, lesson_id) select $1, unnest($2::uuid[])",
    [user, lessons],
  );

type Card = {
  step: string;
  role?: string;
  dueInDays?: number;
  lapses?: number;
  difficulty?: number;
};
const cards = (tx: Transaction, user: string, list: Card[]) =>
  Promise.all(
    list.map((c) =>
      tx.query(
        `insert into public.srs_cards (user_id, step_id, role, state, due_at, lapses, difficulty, reps)
         values ($1, $2, $3::public.dance_role, 'review', now() + make_interval(days => $4), $5, $6, 1)`,
        [
          user,
          c.step,
          c.role ?? "leader",
          c.dueInDays ?? 1,
          c.lapses ?? 0,
          c.difficulty ?? 5,
        ],
      ),
    ),
  );

const review = (
  tx: Transaction,
  user: string,
  step: string,
  rating: number,
  daysAgo: number,
  role = "leader",
) =>
  tx.query(
    `insert into public.step_reviews (user_id, step_id, role, rating, context, reviewed_at)
     values ($1, $2, $3::public.dance_role, $4, 'practice', now() - make_interval(days => $5))`,
    [user, step, role, rating, daysAgo],
  );

type PathRow = {
  lesson_id: string;
  lesson_number: number;
  unit_position: number;
  lesson_position: number;
  status: string;
  step_count: number;
  lesson_count: number;
  course_id: string;
};
const path = async (tx: Transaction, style = SALSA) =>
  (await tx.query<PathRow>("select * from public.course_path($1)", [style]))
    .rows;
const statuses = (rows: PathRow[]) => rows.map((r) => r.status);

beforeAll(async () => {
  db = await createDb();
  await applySeed(db);
  ana = await createUser(db, "ana@example.com");
  beto = await createUser(db, "beto@example.com");
  cesar = await createUser(db, "cesar@example.com");
  await db.query(
    "update public.profiles set dance_role = 'leader' where id = $1",
    [ana],
  );
  await db.query(
    "update public.profiles set dance_role = 'follower' where id = $1",
    [beto],
  );
  await db.query(
    "update public.profiles set app_role = 'admin', dance_role = 'leader' where id = $1",
    [cesar],
  );
  await db.query(
    "insert into public.user_styles (user_id, style_id) values ($1, $2), ($3, $4)",
    [ana, SALSA, beto, MERENGUE],
  );
  // Un estilo sin roles, con un paso, para la regla de la tarjeta `leader` (D051).
  await db.exec(`
    begin;
    insert into public.dance_styles (id, slug, name, spoken_beats, has_roles, start_position_id, published, sort_order)
      values ('${RUEDA}', 'rueda', 'Rueda', '{1,2,3,5,6,7}', false, 'a3000000-0000-4000-8000-000000000001', true, 9);
    insert into public.positions (id, style_id, slug, name)
      values ('a3000000-0000-4000-8000-000000000001', '${RUEDA}', 'rueda', 'Rueda');
    insert into public.steps (id, style_id, slug, name, category, difficulty, start_position_id, end_position_id, published)
      values ('${RUEDA_STEP}', '${RUEDA}', 'dame-una', 'Dame una', 'figura', 2,
              'a3000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', true);
    commit;
  `);
}, 30_000);

describe("course_path", () => {
  test("una fila por lección, en orden de unidad y posición, con número y total", async () => {
    const rows = await withData(ana, none, (tx) => path(tx));
    expect(rows.map((r) => r.lesson_id)).toEqual(Object.values(L));
    expect(rows.map((r) => r.lesson_number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rows.map((r) => [r.unit_position, r.lesson_position])).toEqual([
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 2],
      [2, 3],
    ]);
    expect(rows.every((r) => r.lesson_count === 6)).toBe(true);
    expect(rows.every((r) => r.course_id === SALSA_COURSE)).toBe(true);
    expect(rows.map((r) => r.step_count)).toEqual([1, 3, 2, 2, 2, 1]);
  });

  test("sin lecciones completadas: la primera es la actual y el resto bloqueadas", async () => {
    const rows = await withData(ana, none, (tx) => path(tx));
    expect(statuses(rows)).toEqual([
      "current",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
  });

  test("con una completada: completada, actual la siguiente", async () => {
    const rows = await withData(
      ana,
      (tx) => complete(tx, ana, [L.s1]),
      (tx) => path(tx),
    );
    expect(statuses(rows)).toEqual([
      "completed",
      "current",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
  });

  test("con todas completadas: ninguna actual", async () => {
    const rows = await withData(
      ana,
      (tx) => complete(tx, ana, Object.values(L)),
      (tx) => path(tx),
    );
    expect(new Set(statuses(rows))).toEqual(new Set(["completed"]));
  });

  test("con un hueco: la siguiente a una completada suelta queda disponible", async () => {
    const rows = await withData(
      ana,
      (tx) => complete(tx, ana, [L.s1, L.s3]),
      (tx) => path(tx),
    );
    expect(statuses(rows)).toEqual([
      "completed",
      "current",
      "completed",
      "available",
      "locked",
      "locked",
    ]);
  });

  test("el progreso de otro alumno no cuenta ni se ve", async () => {
    const rows = await withData(
      beto,
      (tx) => complete(tx, ana, [L.s1, L.s2]),
      (tx) => path(tx),
    );
    expect(statuses(rows)[0]).toBe("current");
    expect(statuses(rows)[1]).toBe("locked");
  });

  test("curso sin publicar: sin filas (también para el admin)", async () => {
    const setup = (tx: Transaction) =>
      tx.query("update public.courses set published = false where id = $1", [
        SALSA_COURSE,
      ]);
    expect(await withData(ana, setup, (tx) => path(tx))).toEqual([]);
    expect(await withData(cesar, setup, (tx) => path(tx))).toEqual([]);
  });

  test("estilo sin curso: sin filas", async () => {
    expect(await withData(ana, none, (tx) => path(tx, RUEDA))).toEqual([]);
  });

  test("anónimo no puede llamarla", async () => {
    await expect(
      asAnon(db, (tx) =>
        tx.query("select * from public.course_path($1)", [SALSA]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("private.lesson_unlocked", () => {
  const unlocked = (tx: Transaction, user: string, lesson: string) =>
    tx
      .query<{ u: boolean }>("select private.lesson_unlocked($1, $2) as u", [
        user,
        lesson,
      ])
      .then((r) => r.rows[0].u);

  test("la primera siempre; las demás si la anterior o ella misma están completadas", async () => {
    const result = await withData(
      ana,
      (tx) => complete(tx, ana, [L.s2]),
      async (tx) => ({
        first: await unlocked(tx, ana, L.s1),
        itself: await unlocked(tx, ana, L.s2),
        next: await unlocked(tx, ana, L.s3),
        later: await unlocked(tx, ana, L.s4),
        missing: await unlocked(
          tx,
          ana,
          "d2000000-0000-4000-8000-0000000000ff",
        ),
      }),
    );
    expect(result).toEqual({
      first: true,
      itself: true,
      next: true,
      later: false,
      missing: false,
    });
  });
});

describe("style_progress", () => {
  test("los estilos publicados, los elegidos marcados, con lecciones completadas", async () => {
    const rows = await withData(
      ana,
      (tx) => complete(tx, ana, [L.s1, L.s2]),
      async (tx) =>
        (
          await tx.query(
            "select style_id, name, has_roles, chosen, has_course, lesson_count, completed_count from public.style_progress()",
          )
        ).rows,
    );
    expect(rows).toEqual([
      {
        style_id: SALSA,
        name: "Salsa casino",
        has_roles: true,
        chosen: true,
        has_course: true,
        lesson_count: 6,
        completed_count: 2,
      },
      {
        style_id: MERENGUE,
        name: "Merengue",
        has_roles: true,
        chosen: false,
        has_course: true,
        lesson_count: 6,
        completed_count: 0,
      },
      {
        style_id: RUEDA,
        name: "Rueda",
        has_roles: false,
        chosen: false,
        has_course: false,
        lesson_count: 0,
        completed_count: 0,
      },
    ]);
  });
});

describe("due_steps", () => {
  const due = async (tx: Transaction, style = SALSA) =>
    (
      await tx.query<{ step_id: string; name: string }>(
        "select step_id, name from public.due_steps($1)",
        [style],
      )
    ).rows;

  test("solo tarjetas vencidas del rol del alumno, en ese estilo, las más atrasadas primero", async () => {
    const rows = await withData(
      ana,
      (tx) =>
        cards(tx, ana, [
          { step: GUAPEA, dueInDays: -1 },
          { step: ENCHUFLA, dueInDays: -3 },
          { step: DILE_QUE_SI, dueInDays: 2 }, // no vence aún
          { step: SETENTA, role: "follower", dueInDays: -5 }, // otro rol
          { step: BASICO_MERENGUE, dueInDays: -1 }, // otro estilo
        ]),
      (tx) => due(tx),
    );
    expect(rows.map((r) => r.step_id)).toEqual([ENCHUFLA, GUAPEA]);
  });

  test("seguidor: sus tarjetas de seguidor", async () => {
    const rows = await withData(
      beto,
      (tx) =>
        cards(tx, beto, [
          { step: GUAPEA, role: "leader", dueInDays: -1 },
          { step: ENCHUFLA, role: "follower", dueInDays: -1 },
        ]),
      (tx) => due(tx),
    );
    expect(rows.map((r) => r.step_id)).toEqual([ENCHUFLA]);
  });

  test("estilo sin roles: la tarjeta `leader`, sea cual sea el rol del perfil", async () => {
    const rows = await withData(
      beto,
      (tx) => cards(tx, beto, [{ step: RUEDA_STEP, dueInDays: -1 }]),
      (tx) => due(tx, RUEDA),
    );
    expect(rows.map((r) => r.step_id)).toEqual([RUEDA_STEP]);
  });

  test("no ve las tarjetas de otro alumno", async () => {
    const rows = await withData(
      beto,
      (tx) =>
        cards(tx, ana, [{ step: GUAPEA, role: "follower", dueInDays: -1 }]),
      (tx) => due(tx),
    );
    expect(rows).toEqual([]);
  });
});

describe("hardest_steps", () => {
  type Hard = {
    step_id: string;
    last_rating: number;
    lapses: number;
    difficulty: number;
  };
  const hardest = async (tx: Transaction, limit?: number) =>
    (
      await tx.query<Hard>(
        limit === undefined
          ? "select * from public.hardest_steps($1)"
          : "select * from public.hardest_steps($1, $2)",
        limit === undefined ? [SALSA] : [SALSA, limit],
      )
    ).rows;

  const setup = async (tx: Transaction) => {
    await cards(tx, ana, [
      { step: GUAPEA, lapses: 0 },
      { step: DILE_QUE_SI, lapses: 2 },
      { step: ENCHUFLA, lapses: 0 },
      { step: SETENTA, lapses: 1 },
    ]);
    await review(tx, ana, GUAPEA, 4, 1); // Fácil y sin olvidos: no cuesta
    await review(tx, ana, DILE_QUE_SI, 1, 5); // la anterior no cuenta…
    await review(tx, ana, DILE_QUE_SI, 3, 1); // …la última: Bien, pero con 2 olvidos
    await review(tx, ana, ENCHUFLA, 2, 2); // Difícil
    await review(tx, ana, SETENTA, 1, 3); // Otra vez
  };

  test("última calificación más baja primero, luego más olvidos; fuera lo que no cuesta", async () => {
    const rows = await withData(ana, setup, (tx) => hardest(tx));
    expect(rows.map((r) => [r.step_id, r.last_rating, r.lapses])).toEqual([
      [SETENTA, 1, 1],
      [ENCHUFLA, 2, 0],
      [DILE_QUE_SI, 3, 2],
    ]);
    // La dificultad que devuelve es la del paso (1–5), no la de la tarjeta.
    expect(rows[0].difficulty).toBeGreaterThanOrEqual(1);
    expect(rows[0].difficulty).toBeLessThanOrEqual(5);
  });

  test("respeta el límite", async () => {
    const rows = await withData(ana, setup, (tx) => hardest(tx, 1));
    expect(rows.map((r) => r.step_id)).toEqual([SETENTA]);
  });

  test("sin calificaciones: vacío; otro alumno no ve lo ajeno", async () => {
    expect(await withData(ana, none, (tx) => hardest(tx))).toEqual([]);
    expect(await withData(beto, setup, (tx) => hardest(tx))).toEqual([]);
  });
});
