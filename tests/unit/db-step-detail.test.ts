// Detalle de un paso (20261002160000_step_detail.sql, D138–D140): public.step_detail contra
// PGlite con el seed. Paso publicado por slug, estilo preferido, rol de la tarjeta, videos,
// relacionados e historial propio.
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
const ENCHUFLA = "b1000000-0000-4000-8000-000000000007";
const ENCHUFLA_DOBLE = "b1000000-0000-4000-8000-000000000008";
const SETENTA_SLUG = "setenta";
const RUEDA_ENCHUFLA = "b3000000-0000-4000-8000-000000000001";
const RUEDA_LIBRE = "b3000000-0000-4000-8000-000000000002";

let db: PGlite;
let ana: string; // líder
let beto: string; // seguidor
let cesar: string; // admin
let dora: string; // sin rol

type Related = {
  step_id: string;
  slug: string;
  name: string;
  category: string;
  relation: string;
};
type History = {
  reviewed_at: string;
  rating: number;
  context: string;
  role: string;
};
type Row = {
  step_id: string;
  style_id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  difficulty: number;
  phrases: number;
  beat_notes: { beat: number; note: string }[];
  free: boolean;
  start_position: string;
  end_position: string;
  videos: { role: string; duration_ms: number | null }[];
  role: string | null;
  status: string;
  favorite: boolean;
  due_at: string | null;
  related: Related[];
  history: History[];
};

const detail = async (tx: Transaction, slug: string, style: string = SALSA) =>
  (
    await tx.query<Row>("select * from public.step_detail($1, $2)", [
      style,
      slug,
    ])
  ).rows;

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

/** Repaso de `user` en `step`, hace `days` días. */
const review = (
  tx: Transaction,
  user: string,
  step: string,
  role: "leader" | "follower",
  days: number,
  rating = 3,
  context = "catalog",
) =>
  tx.query(
    `insert into public.step_reviews (user_id, step_id, role, rating, context, reviewed_at)
     values ($1, $2, $3::public.dance_role, $4, $5::public.review_context,
             now() - make_interval(days => $6))`,
    [user, step, role, rating, context, days],
  );

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
  dora = await createUser(db, "dora@example.com");
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
  // Un estilo sin roles con un paso de slug repetido (`enchufla`) y uno libre.
  await db.exec(`
    begin;
    insert into public.dance_styles (id, slug, name, spoken_beats, has_roles, start_position_id, published, sort_order)
      values ('${RUEDA}', 'rueda', 'Rueda', '{1,2,3,5,6,7}', false, '${RUEDA_POSITION}', true, 9);
    insert into public.positions (id, style_id, slug, name)
      values ('${RUEDA_POSITION}', '${RUEDA}', 'rueda', 'Rueda');
    insert into public.steps (id, style_id, slug, name, category, difficulty, start_position_id, end_position_id, published)
      values ('${RUEDA_ENCHUFLA}', '${RUEDA}', 'enchufla', 'Enchufla en rueda', 'salida', 2,
              '${RUEDA_POSITION}', '${RUEDA_POSITION}', true),
             ('${RUEDA_LIBRE}', '${RUEDA}', 'suelta', 'Suelta', 'libre', 1,
              '${RUEDA_POSITION}', '${RUEDA_POSITION}', true);
    commit;
  `);
}, DB_BOOT_TIMEOUT_MS);

describe("step_detail", () => {
  test("anónimo no puede llamarla", async () => {
    await expect(asAnon(db, (tx) => detail(tx, "guapea"))).rejects.toThrow(
      /permission denied/,
    );
  });

  test("el paso publicado con su contenido; sin datos del alumno, no lo sé", async () => {
    const [row, ...rest] = await asUser(db, ana, (tx) => detail(tx, "guapea"));
    expect(rest).toHaveLength(0);
    expect(row).toMatchObject({
      step_id: GUAPEA,
      style_id: SALSA,
      name: "Guapea",
      category: "base",
      difficulty: 1,
      phrases: 1,
      free: false,
      start_position: "Guapea",
      end_position: "Guapea",
      videos: [],
      role: "leader",
      status: "unknown",
      favorite: false,
      due_at: null,
      history: [],
    });
    expect(row.description).toContain("Paso base");
    expect(row.beat_notes.map((n) => n.beat)).toEqual([1, 5]);
  });

  test("slug inexistente o paso sin publicar: ninguna fila (también para el admin)", async () => {
    expect(await asUser(db, ana, (tx) => detail(tx, "no-existe"))).toEqual([]);
    const admin = await withData(
      cesar,
      (tx) =>
        tx.query("update public.steps set published = false where id = $1", [
          GUAPEA,
        ]),
      (tx) => detail(tx, "guapea"),
    );
    expect(admin).toEqual([]);
  });

  test("slug repetido: gana el estilo pedido; si no lo tiene, el primero por orden", async () => {
    const salsa = await asUser(db, ana, (tx) => detail(tx, "enchufla", SALSA));
    expect(salsa[0].step_id).toBe(ENCHUFLA);
    const rueda = await asUser(db, ana, (tx) => detail(tx, "enchufla", RUEDA));
    expect(rueda[0].step_id).toBe(RUEDA_ENCHUFLA);
    // Pedido desde merengue (que no lo tiene): el de salsa, primer estilo por `sort_order`.
    const merengue = await asUser(db, ana, (tx) =>
      detail(tx, "enchufla", MERENGUE),
    );
    expect(merengue[0].step_id).toBe(ENCHUFLA);
    // Un paso que solo existe en otro estilo se encuentra igual.
    const suelta = await asUser(db, ana, (tx) => detail(tx, "suelta", SALSA));
    expect(suelta[0].step_id).toBe(RUEDA_LIBRE);
  });

  test("paso libre o estilo sin roles: free; la tarjeta es de leader (D016, D051)", async () => {
    const [libre] = await asUser(db, beto, (tx) => detail(tx, "suelta", RUEDA));
    expect(libre).toMatchObject({ free: true, role: "leader" });
    const [conRoles] = await asUser(db, beto, (tx) => detail(tx, "guapea"));
    expect(conRoles).toMatchObject({ free: false, role: "follower" });
    const [sinRol] = await asUser(db, dora, (tx) => detail(tx, "guapea"));
    expect(sinRol.role).toBeNull();
  });

  test("videos por rol", async () => {
    const [row] = await withData(
      ana,
      (tx) =>
        tx.query(
          `insert into public.step_videos (step_id, role, video_path, duration_ms)
           values ($1, 'leader', 'videos/guapea-lider.mp4', 42000),
                  ($1, 'follower', 'videos/guapea-seguidora.mp4', 40000)`,
          [GUAPEA],
        ),
      (tx) => detail(tx, "guapea"),
    );
    expect(row.videos).toEqual([
      expect.objectContaining({ role: "leader", duration_ms: 42000 }),
      expect.objectContaining({ role: "follower", duration_ms: 40000 }),
    ]);
  });

  test("relacionados: prerequisitos, el paso base y las variaciones, publicados y sin repetir", async () => {
    // Enchufla doble requiere enchufla y además es su variación: sale una vez, como prerequisito.
    const [doble] = await asUser(db, ana, (tx) => detail(tx, "enchufla-doble"));
    expect(doble.related.map((r) => [r.step_id, r.relation])).toEqual([
      [ENCHUFLA, "prerequisite"],
    ]);
    // Enchufla: su variación. Setenta la requiere, pero eso no la hace relacionada.
    const [enchufla] = await asUser(db, ana, (tx) => detail(tx, "enchufla"));
    expect(enchufla.related).toEqual([
      {
        step_id: ENCHUFLA_DOBLE,
        slug: "enchufla-doble",
        name: "Enchufla doble",
        category: "variacion",
        relation: "variation",
      },
    ]);
    const [setenta] = await asUser(db, ana, (tx) => detail(tx, SETENTA_SLUG));
    expect(setenta.related.map((r) => r.slug)).toEqual(["enchufla"]);
    // Sin publicar, no sale.
    const [hidden] = await withData(
      ana,
      (tx) =>
        tx.query("update public.steps set published = false where id = $1", [
          ENCHUFLA_DOBLE,
        ]),
      (tx) => detail(tx, "enchufla"),
    );
    expect(hidden.related).toEqual([]);
  });

  test("estado, favorito y tarjeta del rol: los de quien llama", async () => {
    const setup = async (tx: Transaction) => {
      await tx.query(
        `insert into public.user_steps (user_id, step_id, status, favorite)
         values ($1, $3, 'learning', true), ($2, $3, 'known', false)`,
        [ana, beto, GUAPEA],
      );
      await card(tx, ana, GUAPEA, "leader", 9);
      await card(tx, ana, GUAPEA, "follower", 2); // otro rol: no cuenta
      await card(tx, beto, GUAPEA, "follower", 5);
    };
    const days = (iso: string | null) =>
      iso ? Math.round((Date.parse(iso) - Date.now()) / 86_400_000) : null;
    const [mine] = await withData(ana, setup, (tx) => detail(tx, "guapea"));
    expect(mine).toMatchObject({ status: "learning", favorite: true });
    expect(days(mine.due_at)).toBe(9);
    const [other] = await withData(beto, setup, (tx) => detail(tx, "guapea"));
    expect(other).toMatchObject({ status: "known", favorite: false });
    expect(days(other.due_at)).toBe(5);
    // El admin lee las filas de todos por RLS, pero su detalle solo trae lo suyo.
    const [admin] = await withData(cesar, setup, (tx) => detail(tx, "guapea"));
    expect(admin).toMatchObject({
      status: "unknown",
      favorite: false,
      due_at: null,
    });
  });

  test("historial: los últimos 10 repasos propios del paso, del más reciente", async () => {
    const setup = async (tx: Transaction) => {
      for (let d = 1; d <= 12; d++)
        await review(
          tx,
          ana,
          GUAPEA,
          d % 2 ? "leader" : "follower",
          d,
          1 + (d % 4),
        );
      await review(tx, ana, ENCHUFLA, "leader", 0); // otro paso
      await review(tx, beto, GUAPEA, "follower", 0, 4, "lesson"); // otro alumno
    };
    const [row] = await withData(ana, setup, (tx) => detail(tx, "guapea"));
    expect(row.history).toHaveLength(10);
    const times = row.history.map((h) => Date.parse(h.reviewed_at));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(row.history[0]).toMatchObject({
      rating: 2,
      context: "catalog",
      role: "leader",
    });
    const [admin] = await withData(cesar, setup, (tx) => detail(tx, "guapea"));
    expect(admin.history).toEqual([]);
  });
});
