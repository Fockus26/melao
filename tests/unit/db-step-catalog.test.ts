// Catálogo de pasos (20261002120000_step_catalog.sql, D127–D129): public.step_catalog y el
// favorito de `user_steps` que escribe el cliente (insert de su fila + update de `favorite`),
// contra PGlite con el seed.
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
const RUEDA = "a0000000-0000-4000-8000-0000000000c1"; // sin roles (creado aquí)
const RUEDA_POSITION = "a3000000-0000-4000-8000-000000000001";
const GUAPEA = "b1000000-0000-4000-8000-000000000001";
const DILE_QUE_SI = "b1000000-0000-4000-8000-000000000003";
const ENCHUFLA = "b1000000-0000-4000-8000-000000000007";
const BASICO_MERENGUE = "b2000000-0000-4000-8000-000000000001";
const RUEDA_STEP = "b3000000-0000-4000-8000-000000000001";

/** Orden de `step_category` (el del enum). */
const CATEGORY_ORDER = [
  "base",
  "vuelta",
  "entrada",
  "salida",
  "figura",
  "variacion",
  "libre",
];

let db: PGlite;
let ana: string; // líder
let beto: string; // seguidor
let cesar: string; // admin

type Row = {
  step_id: string;
  slug: string;
  name: string;
  category: string;
  difficulty: number;
  status: string;
  favorite: boolean;
  due_at: string | null;
};

const catalog = async (tx: Transaction, style = SALSA) =>
  (await tx.query<Row>("select * from public.step_catalog($1)", [style])).rows;

const none = async () => {};

/** Prepara como superusuario y consulta como `uid`; la transacción siempre se revierte. */
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

/** Tarjeta FSRS de `user` en `step` para `role`, que vence dentro de `days` (negativo: vencida). */
const card = (
  tx: Transaction,
  user: string,
  step: string,
  role: "leader" | "follower",
  days: number,
) =>
  tx.query(
    `insert into public.srs_cards (user_id, step_id, role, state, due_at, reps)
     values ($1, $2, $3::public.dance_role, 'review', now() + make_interval(days => $4), 1)`,
    [user, step, role, days],
  );

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
  // Un estilo sin roles, con un paso, para la regla de la tarjeta `leader` (D051).
  await db.exec(`
    begin;
    insert into public.dance_styles (id, slug, name, spoken_beats, has_roles, start_position_id, published, sort_order)
      values ('${RUEDA}', 'rueda', 'Rueda', '{1,2,3,5,6,7}', false, '${RUEDA_POSITION}', true, 9);
    insert into public.positions (id, style_id, slug, name)
      values ('${RUEDA_POSITION}', '${RUEDA}', 'rueda', 'Rueda');
    insert into public.steps (id, style_id, slug, name, category, difficulty, start_position_id, end_position_id, published)
      values ('${RUEDA_STEP}', '${RUEDA}', 'dame-una', 'Dame una', 'figura', 2,
              '${RUEDA_POSITION}', '${RUEDA_POSITION}', true);
    commit;
  `);
}, DB_BOOT_TIMEOUT_MS);

describe("step_catalog", () => {
  test("anónimo no puede llamarla", async () => {
    await expect(asAnon(db, (tx) => catalog(tx))).rejects.toThrow(
      /permission denied/,
    );
  });

  test("todos los pasos publicados del estilo; sin datos, no lo sé, sin favorito ni repaso", async () => {
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::int as n from public.steps where style_id = $1 and published",
      [SALSA],
    );
    const list = await asUser(db, ana, (tx) => catalog(tx));
    expect(list).toHaveLength(rows[0].n);
    expect(list.length).toBeGreaterThan(1);
    expect(list.every((r) => r.status === "unknown")).toBe(true);
    expect(list.some((r) => r.favorite)).toBe(false);
    expect(list.every((r) => r.due_at === null)).toBe(true);
    expect(list.find((r) => r.step_id === GUAPEA)).toMatchObject({
      slug: "guapea",
      name: "Guapea",
      category: "base",
      difficulty: 1,
    });
  });

  test("por categoría (orden del enum) y, dentro, por sort_order", async () => {
    const list = await asUser(db, ana, (tx) => catalog(tx));
    const ranks = list.map((r) => CATEGORY_ORDER.indexOf(r.category));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    const { rows } = await db.query<{ id: string; category: string }>(
      `select id, category::text from public.steps
        where style_id = $1 and published order by sort_order, name`,
      [SALSA],
    );
    for (const category of CATEGORY_ORDER) {
      expect(
        list.filter((r) => r.category === category).map((r) => r.step_id),
      ).toEqual(rows.filter((r) => r.category === category).map((r) => r.id));
    }
  });

  test("solo el estilo pedido; los sin publicar no salen (tampoco para el admin)", async () => {
    const merengue = await asUser(db, ana, (tx) => catalog(tx, MERENGUE));
    expect(merengue.map((r) => r.step_id)).toContain(BASICO_MERENGUE);
    expect(merengue.map((r) => r.step_id)).not.toContain(GUAPEA);
    const admin = await withData(
      cesar,
      (tx) =>
        tx.query("update public.steps set published = false where id = $1", [
          ENCHUFLA,
        ]),
      (tx) => catalog(tx),
    );
    expect(admin.map((r) => r.step_id)).not.toContain(ENCHUFLA);
  });

  test("estado y favorito: los de quien llama, nunca los de otro alumno", async () => {
    const setup = (tx: Transaction) =>
      tx.query(
        `insert into public.user_steps (user_id, step_id, status, favorite)
         values ($1, $3, 'learning', true), ($1, $4, 'known', false),
                ($2, $3, 'known', false), ($2, $5, 'learning', true)`,
        [ana, beto, GUAPEA, DILE_QUE_SI, ENCHUFLA],
      );
    const list = await withData(ana, setup, (tx) => catalog(tx));
    const by = Object.fromEntries(list.map((r) => [r.step_id, r]));
    expect(by[GUAPEA]).toMatchObject({ status: "learning", favorite: true });
    expect(by[DILE_QUE_SI]).toMatchObject({ status: "known", favorite: false });
    expect(by[ENCHUFLA]).toMatchObject({ status: "unknown", favorite: false });
    // El admin lee `user_steps` de todos por RLS, pero el catálogo solo muestra lo suyo.
    const admin = await withData(cesar, setup, (tx) => catalog(tx));
    expect(admin.every((r) => r.status === "unknown" && !r.favorite)).toBe(
      true,
    );
  });

  test("próximo repaso: la tarjeta del rol del perfil", async () => {
    const setup = async (tx: Transaction) => {
      await card(tx, ana, GUAPEA, "leader", 9);
      await card(tx, ana, DILE_QUE_SI, "follower", 3); // otro rol: no cuenta
      await card(tx, ana, ENCHUFLA, "leader", -2); // vencida
      await card(tx, beto, DILE_QUE_SI, "follower", 5);
    };
    const list = await withData(ana, setup, (tx) => catalog(tx));
    const due = (id: string) => list.find((r) => r.step_id === id)?.due_at;
    const days = (iso: string | null | undefined) =>
      iso ? Math.round((Date.parse(iso) - Date.now()) / 86_400_000) : null;
    expect(days(due(GUAPEA))).toBe(9);
    expect(due(DILE_QUE_SI)).toBeNull();
    expect(days(due(ENCHUFLA))).toBe(-2);
    const seguidor = await withData(beto, setup, (tx) => catalog(tx));
    expect(days(seguidor.find((r) => r.step_id === DILE_QUE_SI)?.due_at)).toBe(
      5,
    );
    expect(seguidor.find((r) => r.step_id === GUAPEA)?.due_at).toBeNull();
    // El admin no ve las tarjetas de los alumnos en su catálogo.
    const admin = await withData(cesar, setup, (tx) => catalog(tx));
    expect(admin.every((r) => r.due_at === null)).toBe(true);
  });

  test("estilo sin roles: la tarjeta es la de leader, aunque el perfil sea follower", async () => {
    const list = await withData(
      beto,
      async (tx) => {
        await card(tx, beto, RUEDA_STEP, "leader", 4);
      },
      (tx) => catalog(tx, RUEDA),
    );
    expect(list).toHaveLength(1);
    expect(list[0].due_at).not.toBeNull();
  });
});

describe("user_steps: favorito desde el cliente (lib/steps/favorite.ts)", () => {
  const favorite = async (tx: Transaction, uid: string, step: string) =>
    (
      await tx.query<{ favorite: boolean; status: string }>(
        "select favorite, status::text from public.user_steps where user_id = $1 and step_id = $2",
        [uid, step],
      )
    ).rows[0];

  test("el primero crea la fila (insert); los siguientes cambian solo favorite (update)", async () => {
    const result = await withData(ana, none, async (tx) => {
      const updated = await tx.query(
        "update public.user_steps set favorite = true where user_id = $1 and step_id = $2 returning step_id",
        [ana, GUAPEA],
      );
      expect(updated.rows).toHaveLength(0);
      await tx.query(
        "insert into public.user_steps (user_id, step_id, favorite) values ($1, $2, true)",
        [ana, GUAPEA],
      );
      const again = await tx.query(
        "update public.user_steps set favorite = false where user_id = $1 and step_id = $2 returning step_id",
        [ana, GUAPEA],
      );
      expect(again.rows).toHaveLength(1);
      return favorite(tx, ana, GUAPEA);
    });
    expect(result).toEqual({ favorite: false, status: "unknown" });
  });

  test("el alumno no cambia su estado ni toca filas de otro", async () => {
    await expect(
      withData(ana, none, (tx) =>
        tx.query(
          "insert into public.user_steps (user_id, step_id, status) values ($1, $2, 'known')",
          [ana, GUAPEA],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      withData(ana, none, (tx) =>
        tx.query(
          "insert into public.user_steps (user_id, step_id, favorite) values ($1, $2, true)",
          [beto, GUAPEA],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    const touched = await withData(
      ana,
      (tx) =>
        tx.query(
          "insert into public.user_steps (user_id, step_id, favorite) values ($1, $2, true)",
          [beto, GUAPEA],
        ),
      (tx) =>
        tx.query(
          "update public.user_steps set favorite = false where user_id = $1 returning step_id",
          [beto],
        ),
    );
    expect(touched.rows).toHaveLength(0);
  });
});
