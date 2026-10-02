// Perfil (20261002140000_profile.sql): `my_subscription()` devuelve la suscripción que muestra
// Perfil, solo la de quien llama (también el admin), con el estado ya resuelto (D135).
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
let ana: string; // sin suscripción
let beto: string; // activa
let carla: string; // una vencida y una activa
let dani: string; // pago pendiente
let eva: string; // activa con el período vencido
let fede: string; // cancelada, de un plan que dejó de estar activo
let cesar: string; // admin, sin suscripción propia

type Row = {
  plan_name: string | null;
  price_cents: number | null;
  billing_interval: string | null;
  status: string;
  state: string;
  current_period_end: string;
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

const mine = (user: string) =>
  asUser(
    db,
    user,
    async (tx) =>
      (await tx.query<Row>("select * from public.my_subscription()")).rows,
  );

beforeAll(async () => {
  db = await createDb();
  [ana, beto, carla, dani, eva, fede, cesar] = await Promise.all(
    ["ana", "beto", "carla", "dani", "eva", "fede", "cesar"].map((n) =>
      createUser(db, `${n}@example.com`),
    ),
  );
  await db.query(
    "update public.profiles set app_role = 'admin' where id = $1",
    [cesar],
  );
  await db.query(
    `insert into public.plans (slug, name, price_cents, billing_interval, is_active)
     values ('viejo', 'Plan viejo', 1500, 'year', false)`,
  );
  await subscribe(beto, "active", "2099-01-01");
  await subscribe(carla, "expired", "2020-01-01");
  await subscribe(carla, "active", "2099-02-01");
  await subscribe(dani, "past_due", "2026-09-01");
  await subscribe(eva, "active", "2020-06-01");
  await subscribe(fede, "canceled", "2026-08-01", "viejo");
}, DB_BOOT_TIMEOUT_MS);

describe("my_subscription", () => {
  test("sin suscripción: ninguna fila", async () => {
    expect(await mine(ana)).toEqual([]);
  });

  test("activa: el plan con su precio y estado active", async () => {
    const [row] = await mine(beto);
    expect(row).toMatchObject({
      plan_name: "Básico",
      billing_interval: "month",
      status: "active",
      state: "active",
    });
    expect(row.price_cents).toBeGreaterThan(0);
  });

  test("con varias: la vigente primero", async () => {
    const rows = await mine(carla);
    expect(rows.map((r) => r.state)).toEqual(["active"]);
  });

  test("pago pendiente y activa con el período vencido", async () => {
    expect((await mine(dani))[0].state).toBe("past_due");
    expect((await mine(eva))[0]).toMatchObject({
      status: "active",
      state: "expired",
    });
  });

  test("plan inactivo: la suscripción se ve, sin datos del plan", async () => {
    expect((await mine(fede))[0]).toMatchObject({
      plan_name: null,
      price_cents: null,
      state: "canceled",
    });
  });

  test("el admin ve solo la suya, aunque RLS le deje leer todas", async () => {
    expect(await mine(cesar)).toEqual([]);
  });

  test("anon no la ejecuta", async () => {
    await expect(
      asAnon(db, (tx) => tx.query("select * from public.my_subscription()")),
    ).rejects.toThrow(/permission denied/);
  });
});
