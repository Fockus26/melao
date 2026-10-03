// Admin · Usuarios (20261003140000_admin_users.sql): `admin_users()` y `admin_user_counts()`
// solo para el admin, con el correo de auth.users, el estado de my_subscription(), búsqueda sin
// acentos, filtro por estado y paginación con total (D156–D157).
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
const ids: Record<string, string> = {};

type Row = {
  user_id: string;
  display_name: string | null;
  email: string;
  app_role: string;
  dance_role: string | null;
  plan_name: string | null;
  state: string;
  current_period_end: string | null;
  total_count: number;
};

type Counts = {
  all_count: number;
  active_count: number;
  past_due_count: number;
  canceled_count: number;
  expired_count: number;
  none_count: number;
};

async function subscribe(
  user: string,
  status: string,
  periodEnd: string,
  plan = "basico",
) {
  await db.query(
    `insert into public.subscriptions
       (user_id, plan_id, status, provider, current_period_start, current_period_end)
     select $1, id, $2::public.subscription_status, 'placeholder',
            $3::timestamptz - interval '30 days', $3::timestamptz
       from public.plans where slug = $4`,
    [user, status, periodEnd, plan],
  );
}

const list = (
  who: string,
  args: {
    q?: string | null;
    state?: string | null;
    limit?: number;
    offset?: number;
  } = {},
) =>
  asUser(
    db,
    who,
    async (tx) =>
      (
        await tx.query<Row>(
          "select * from public.admin_users($1, $2, $3, $4)",
          [
            args.q ?? null,
            args.state ?? null,
            args.limit ?? 25,
            args.offset ?? 0,
          ],
        )
      ).rows,
  );

const counts = (who: string, q: string | null = null) =>
  asUser(
    db,
    who,
    async (tx) =>
      (
        await tx.query<Counts>("select * from public.admin_user_counts($1)", [
          q,
        ])
      ).rows[0],
  );

const mine = (who: string) =>
  asUser(
    db,
    who,
    async (tx) =>
      (
        await tx.query<{ state: string }>(
          "select state from public.my_subscription()",
        )
      ).rows[0]?.state ?? "none",
  );

// [clave, correo, nombre, alta]: el alta fija el orden (la más reciente primero).
const PEOPLE: [string, string, string | null, string][] = [
  ["cesar", "cesar@example.com", "César Admin", "2026-01-01"],
  ["ana", "ana.lopez@example.com", "Ana López", "2026-02-01"],
  ["beto", "beto@example.com", "Beto Martínez", "2026-03-01"],
  ["carla", "carla@example.com", "Carla Núñez", "2026-04-01"],
  ["dani", "dani@example.com", "Daniela Pérez", "2026-05-01"],
  ["eva", "eva@example.com", "Eva Gómez", "2026-06-01"],
  ["fede", "fede@example.com", "Federico Ruiz", "2026-07-01"],
  ["gabi", "gabi.profe@example.com", null, "2026-08-01"],
];

beforeAll(async () => {
  db = await createDb();
  for (const [key, email, name, createdAt] of PEOPLE) {
    ids[key] = await createUser(db, email, name ? { full_name: name } : {});
    await db.query("update public.profiles set created_at = $2 where id = $1", [
      ids[key],
      createdAt,
    ]);
  }
  await db.query(
    "update public.profiles set app_role = 'admin' where id = $1",
    [ids.cesar],
  );
  await db.query(
    "update public.profiles set app_role = 'teacher', dance_role = 'follower' where id = $1",
    [ids.gabi],
  );
  await db.query(
    "update auth.users set last_sign_in_at = '2026-10-01T10:00:00Z' where id = $1",
    [ids.beto],
  );
  await db.query(
    `insert into public.plans (slug, name, price_cents, billing_interval, is_active)
     values ('viejo', 'Plan viejo', 1500, 'year', false)`,
  );
  // ana: sin suscripción.
  await subscribe(ids.beto, "active", "2099-01-01");
  await subscribe(ids.carla, "expired", "2020-01-01");
  await subscribe(ids.carla, "active", "2099-02-01", "consultoria");
  await subscribe(ids.dani, "past_due", "2026-09-01");
  await subscribe(ids.eva, "active", "2020-06-01");
  await subscribe(ids.fede, "canceled", "2026-08-01", "viejo");
}, DB_BOOT_TIMEOUT_MS);

describe("admin_users: permisos", () => {
  test("un alumno no la ejecuta (42501)", async () => {
    await expect(list(ids.ana)).rejects.toMatchObject({ code: "42501" });
    await expect(counts(ids.ana)).rejects.toMatchObject({ code: "42501" });
  });

  test("un teacher tampoco", async () => {
    await expect(list(ids.gabi)).rejects.toMatchObject({ code: "42501" });
  });

  test("anon no tiene permiso", async () => {
    await expect(
      asAnon(db, (tx) => tx.query("select * from public.admin_users()")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asAnon(db, (tx) => tx.query("select * from public.admin_user_counts()")),
    ).rejects.toThrow(/permission denied/);
  });

  test("la base privada no se llama desde la API", async () => {
    await expect(
      asUser(db, ids.cesar, (tx) =>
        tx.query("select * from private.admin_user_rows(null)"),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("admin_users: lista", () => {
  test("todos, alta más reciente primero, con correo, roles y total", async () => {
    const rows = await list(ids.cesar);
    expect(rows.map((r) => r.email)).toEqual(
      [...PEOPLE].reverse().map(([, email]) => email),
    );
    expect(rows.every((r) => r.total_count === PEOPLE.length)).toBe(true);
    const gabi = rows.find((r) => r.user_id === ids.gabi);
    expect(gabi).toMatchObject({
      display_name: null,
      app_role: "teacher",
      dance_role: "follower",
      state: "none",
      plan_name: null,
    });
    expect(rows.find((r) => r.user_id === ids.cesar)?.app_role).toBe("admin");
  });

  test("el estado es el mismo que ve cada uno en my_subscription", async () => {
    const rows = await list(ids.cesar);
    for (const row of rows) {
      if (row.user_id === ids.gabi || row.user_id === ids.cesar) continue;
      expect(row.state).toBe(await mine(row.user_id));
    }
    const by = (k: string) => rows.find((r) => r.user_id === ids[k]);
    expect(by("beto")?.state).toBe("active");
    expect(by("carla")).toMatchObject({
      state: "active",
      plan_name: "Consultoría",
    });
    expect(by("dani")?.state).toBe("past_due");
    expect(by("eva")?.state).toBe("expired");
    // El plan inactivo se nombra igual: el admin lo lee.
    expect(by("fede")).toMatchObject({
      state: "canceled",
      plan_name: "Plan viejo",
    });
    expect(by("ana")).toMatchObject({
      state: "none",
      current_period_end: null,
    });
  });

  test("último acceso desde auth.users", async () => {
    const { rows } = await asUser(db, ids.cesar, (tx) =>
      tx.query<{ last_sign_in_at: Date | null }>(
        "select last_sign_in_at from public.admin_users('beto')",
      ),
    );
    expect(rows[0].last_sign_in_at?.toISOString()).toBe(
      "2026-10-01T10:00:00.000Z",
    );
  });
});

describe("admin_users: búsqueda, filtro y páginas", () => {
  test("por nombre sin acentos ni mayúsculas", async () => {
    const rows = await list(ids.cesar, { q: "NUNEZ" });
    expect(rows.map((r) => r.user_id)).toEqual([ids.carla]);
    expect(rows[0].total_count).toBe(1);
  });

  test("por correo, y cada palabra en nombre o correo", async () => {
    expect(
      (await list(ids.cesar, { q: "profe" })).map((r) => r.user_id),
    ).toEqual([ids.gabi]);
    expect(
      (await list(ids.cesar, { q: "  lópez   ANA.lopez " })).map(
        (r) => r.user_id,
      ),
    ).toEqual([ids.ana]);
    expect(await list(ids.cesar, { q: "ana beto" })).toEqual([]);
  });

  test("los comodines de LIKE se buscan como texto", async () => {
    expect(await list(ids.cesar, { q: "%" })).toEqual([]);
    expect(await list(ids.cesar, { q: "_" })).toEqual([]);
  });

  test("búsqueda vacía o en blanco = todos", async () => {
    expect(await list(ids.cesar, { q: "   " })).toHaveLength(PEOPLE.length);
    expect(await list(ids.cesar, { q: "" })).toHaveLength(PEOPLE.length);
  });

  test("filtro por estado, también none", async () => {
    const active = await list(ids.cesar, { state: "active" });
    expect(active.map((r) => r.user_id).sort()).toEqual(
      [ids.beto, ids.carla].sort(),
    );
    expect(active[0].total_count).toBe(2);
    const none = await list(ids.cesar, { state: "none" });
    expect(none.map((r) => r.user_id).sort()).toEqual(
      [ids.ana, ids.cesar, ids.gabi].sort(),
    );
    expect(await list(ids.cesar, { state: "" })).toHaveLength(PEOPLE.length);
  });

  test("estado desconocido → 22023", async () => {
    await expect(list(ids.cesar, { state: "activo" })).rejects.toMatchObject({
      code: "22023",
    });
  });

  test("paginación: páginas que no se pisan y total de todas", async () => {
    const first = await list(ids.cesar, { limit: 3, offset: 0 });
    const second = await list(ids.cesar, { limit: 3, offset: 3 });
    const third = await list(ids.cesar, { limit: 3, offset: 6 });
    expect(first).toHaveLength(3);
    expect(third).toHaveLength(2);
    expect(first[0].total_count).toBe(PEOPLE.length);
    expect(third[0].total_count).toBe(PEOPLE.length);
    const all = [...first, ...second, ...third].map((r) => r.user_id);
    expect(new Set(all).size).toBe(PEOPLE.length);
    expect(await list(ids.cesar, { limit: 3, offset: 30 })).toEqual([]);
  });

  test("límite acotado a 1–100 y offset negativo a 0", async () => {
    expect(await list(ids.cesar, { limit: 0 })).toHaveLength(1);
    expect(await list(ids.cesar, { limit: 500 })).toHaveLength(PEOPLE.length);
    expect(await list(ids.cesar, { limit: 2, offset: -5 })).toHaveLength(2);
  });
});

describe("admin_user_counts", () => {
  test("un contador por estado, con la búsqueda", async () => {
    expect(await counts(ids.cesar)).toEqual({
      all_count: 8,
      active_count: 2,
      past_due_count: 1,
      canceled_count: 1,
      expired_count: 1,
      none_count: 3,
    });
    expect(await counts(ids.cesar, "example.com carla")).toMatchObject({
      all_count: 1,
      active_count: 1,
      none_count: 0,
    });
  });
});
