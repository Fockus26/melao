// Progreso (20261002130000_progress.sql, D130–D131): review_forecast y step_status_counts,
// contra PGlite con el seed.
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import {
  applySeed,
  asAnon,
  createDb,
  createUser,
  DB_BOOT_TIMEOUT_MS,
} from "../db/harness";

const SALSA = "a0000000-0000-4000-8000-000000000001";
const MERENGUE = "a0000000-0000-4000-8000-000000000002";
const RUEDA = "a0000000-0000-4000-8000-0000000000c1"; // sin roles (creado aquí)
const GUAPEA = "b1000000-0000-4000-8000-000000000001";
const DILE_QUE_SI = "b1000000-0000-4000-8000-000000000003";
const ENCHUFLA = "b1000000-0000-4000-8000-000000000007";
const BASICO_MERENGUE = "b2000000-0000-4000-8000-000000000001";
const RUEDA_STEP = "b3000000-0000-4000-8000-000000000001";
const BOGOTA = "America/Bogota"; // UTC−5, sin horario de verano
const TOKYO = "Asia/Tokyo"; // UTC+9

let db: PGlite;
let ana: string; // líder
let beto: string; // seguidor
let cesar: string; // admin

/** Datos como superusuario y consulta como el alumno, en una transacción que se revierte. */
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

/** Tarjeta con `due_at` dado como expresión SQL (p. ej. `now() + interval '2 days'`). */
const card = (
  tx: Transaction,
  user: string,
  step: string,
  dueSql: string,
  role = "leader",
) =>
  tx.query(
    `insert into public.srs_cards (user_id, step_id, role, state, due_at, reps)
     values ($1, $2, $3::public.dance_role, 'review', ${dueSql}, 1)`,
    [user, step, role],
  );

/** Instante a `minutes` de la medianoche que abre el día `offsetDays` (0 = hoy) en `tz`. */
const nearMidnight = (tz: string, offsetDays: number, minutes: number) =>
  `((date_trunc('day', now() at time zone '${tz}') + interval '${offsetDays} days' + interval '${minutes} minutes') at time zone '${tz}')`;

type ForecastRow = { day: string | Date; due_count: number };
const forecast = async (
  tx: Transaction,
  style = SALSA,
  tz = BOGOTA,
  days?: number,
) =>
  (
    await tx.query<ForecastRow>(
      days === undefined
        ? "select * from public.review_forecast($1, p_tz => $2)"
        : "select * from public.review_forecast($1, $3, $2)",
      days === undefined ? [style, tz] : [style, tz, days],
    )
  ).rows;
const counts = (rows: ForecastRow[]) => rows.map((r) => r.due_count);

type StatusRow = {
  unknown_count: number;
  learning_count: number;
  known_count: number;
  total: number;
};
const statusCounts = async (tx: Transaction, style = SALSA) =>
  (
    await tx.query<StatusRow>("select * from public.step_status_counts($1)", [
      style,
    ])
  ).rows;

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
  // Un estilo sin roles, con un paso, para la tarjeta `leader` (D051).
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
}, DB_BOOT_TIMEOUT_MS);

describe("review_forecast", () => {
  test("7 días desde hoy en la zona del dispositivo, también los vacíos", async () => {
    const rows = await withData(ana, none, (tx) => forecast(tx));
    expect(counts(rows)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    const today = await db.query<{ d: string }>(
      `select (now() at time zone '${BOGOTA}')::date::text as d`,
    );
    const days = rows.map((r) =>
      r.day instanceof Date
        ? r.day.toISOString().slice(0, 10)
        : String(r.day).slice(0, 10),
    );
    expect(days[0]).toBe(today.rows[0].d);
    // Días consecutivos.
    for (let i = 1; i < days.length; i++) {
      expect(Date.parse(days[i]) - Date.parse(days[i - 1])).toBe(86_400_000);
    }
  });

  test("los vencidos (ayer y antes) cuentan hoy; cada uno en su día", async () => {
    const rows = await withData(
      ana,
      async (tx) => {
        await card(tx, ana, GUAPEA, "now() - interval '3 days'");
        await card(tx, ana, DILE_QUE_SI, nearMidnight(BOGOTA, 0, 1));
        await card(tx, ana, ENCHUFLA, nearMidnight(BOGOTA, 2, 30));
      },
      (tx) => forecast(tx),
    );
    expect(counts(rows)).toEqual([2, 0, 1, 0, 0, 0, 0]);
  });

  test("borde de medianoche: un minuto antes es hoy, un minuto después es mañana", async () => {
    const run = (minutes: number) =>
      withData(
        ana,
        (tx) => card(tx, ana, GUAPEA, nearMidnight(BOGOTA, 1, minutes)),
        (tx) => forecast(tx),
      );
    expect(counts(await run(-1))).toEqual([1, 0, 0, 0, 0, 0, 0]);
    expect(counts(await run(1))).toEqual([0, 1, 0, 0, 0, 0, 0]);
  });

  test("el mismo instante cae en días distintos según la zona", async () => {
    // Las 23:30 de mañana en Bogotá son pasado mañana en Tokio (14 h después).
    const setup = (tx: Transaction) =>
      card(tx, ana, GUAPEA, nearMidnight(BOGOTA, 1, 23 * 60 + 30));
    const bogota = await withData(ana, setup, (tx) => forecast(tx));
    const tokyo = await withData(ana, setup, (tx) =>
      forecast(tx, SALSA, TOKYO),
    );
    expect(counts(bogota).indexOf(1)).toBe(1);
    // En Tokio es pasado mañana de Bogotá; su "hoy" puede ir un día por delante del de Bogotá.
    const ahead = await db.query<{ n: number }>(
      `select ((now() at time zone '${TOKYO}')::date - (now() at time zone '${BOGOTA}')::date)::integer as n`,
    );
    expect(counts(tokyo).indexOf(1)).toBe(2 - ahead.rows[0].n);
  });

  test("solo las tarjetas del rol del perfil; estilo sin roles → leader", async () => {
    const salsa = await withData(
      beto,
      async (tx) => {
        await card(tx, beto, GUAPEA, "now()", "leader");
        await card(tx, beto, DILE_QUE_SI, "now()", "follower");
      },
      (tx) => forecast(tx),
    );
    expect(counts(salsa)[0]).toBe(1);
    const rueda = await withData(
      beto,
      (tx) => card(tx, beto, RUEDA_STEP, "now()", "leader"),
      (tx) => forecast(tx, RUEDA),
    );
    expect(counts(rueda)[0]).toBe(1);
  });

  test("solo el estilo pedido y los pasos publicados", async () => {
    const rows = await withData(
      ana,
      async (tx) => {
        await card(tx, ana, BASICO_MERENGUE, "now()");
        await card(tx, ana, GUAPEA, "now()");
        await tx.query(
          "update public.steps set published = false where id = $1",
          [GUAPEA],
        );
      },
      (tx) => forecast(tx),
    );
    expect(counts(rows)[0]).toBe(0);
  });

  test("las tarjetas de otro alumno no cuentan, tampoco para el admin", async () => {
    const setup = (tx: Transaction) => card(tx, ana, GUAPEA, "now()");
    expect(counts(await withData(beto, setup, (tx) => forecast(tx)))[0]).toBe(
      0,
    );
    expect(counts(await withData(cesar, setup, (tx) => forecast(tx)))[0]).toBe(
      0,
    );
  });

  test("p_days se acota a 1…14", async () => {
    expect(
      await withData(ana, none, (tx) => forecast(tx, SALSA, BOGOTA, 0)),
    ).toHaveLength(1);
    expect(
      await withData(ana, none, (tx) => forecast(tx, SALSA, BOGOTA, 60)),
    ).toHaveLength(14);
    expect(
      await withData(ana, none, (tx) => forecast(tx, SALSA, BOGOTA, 3)),
    ).toHaveLength(3);
  });

  test("zona desconocida → error", async () => {
    await expect(
      withData(ana, none, (tx) => forecast(tx, SALSA, "Marte/Olympus")),
    ).rejects.toThrow();
  });

  test("anónimo no puede llamarla", async () => {
    await expect(
      asAnon(db, (tx) =>
        tx.query("select * from public.review_forecast($1, 7, 'UTC')", [SALSA]),
      ),
    ).rejects.toThrow();
  });
});

describe("step_status_counts", () => {
  const publishedSalsa = async () =>
    (
      await db.query<{ n: number }>(
        "select count(*)::integer as n from public.steps where style_id = $1 and published",
        [SALSA],
      )
    ).rows[0].n;

  test("sin marcas: todos los publicados en 'no lo sé'", async () => {
    const total = await publishedSalsa();
    expect(total).toBeGreaterThan(0);
    const rows = await withData(ana, none, (tx) => statusCounts(tx));
    expect(rows).toEqual([
      {
        unknown_count: total,
        learning_count: 0,
        known_count: 0,
        total,
      },
    ]);
  });

  test("cuenta aprendiendo y me lo sé; solo los del alumno y del estilo", async () => {
    const total = await publishedSalsa();
    const setup = async (tx: Transaction) => {
      await tx.query(
        `insert into public.user_steps (user_id, step_id, status) values
           ($1, $2, 'learning'), ($1, $3, 'known'), ($1, $4, 'unknown'), ($1, $5, 'known'),
           ($6, $2, 'known')`,
        [ana, GUAPEA, DILE_QUE_SI, ENCHUFLA, BASICO_MERENGUE, beto],
      );
    };
    const [row] = await withData(ana, setup, (tx) => statusCounts(tx));
    expect(row).toEqual({
      unknown_count: total - 2,
      learning_count: 1,
      known_count: 1,
      total,
    });
    // El admin ve por RLS las filas de todos, pero aquí cuenta solo las suyas.
    const [admin] = await withData(cesar, setup, (tx) => statusCounts(tx));
    expect(admin.known_count).toBe(0);
  });

  test("los pasos sin publicar no cuentan", async () => {
    const total = await publishedSalsa();
    const [row] = await withData(
      ana,
      async (tx) => {
        await tx.query(
          "insert into public.user_steps (user_id, step_id, status) values ($1, $2, 'known')",
          [ana, GUAPEA],
        );
        await tx.query(
          "update public.steps set published = false where id = $1",
          [GUAPEA],
        );
      },
      (tx) => statusCounts(tx),
    );
    expect(row).toEqual({
      unknown_count: total - 1,
      learning_count: 0,
      known_count: 0,
      total: total - 1,
    });
  });

  test("estilo sin pasos: una fila en ceros", async () => {
    const rows = await withData(ana, none, (tx) =>
      statusCounts(tx, "a0000000-0000-4000-8000-0000000000ff"),
    );
    expect(rows).toEqual([
      { unknown_count: 0, learning_count: 0, known_count: 0, total: 0 },
    ]);
  });

  test("anónimo no puede llamarla", async () => {
    await expect(
      asAnon(db, (tx) =>
        tx.query("select * from public.step_status_counts($1)", [MERENGUE]),
      ),
    ).rejects.toThrow();
  });
});
