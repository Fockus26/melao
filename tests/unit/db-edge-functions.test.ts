// Funciones SQL de las Edge Functions (migración 20260929120000_edge_functions.sql) y los
// handlers de activate-subscription y review-steps de punta a punta contra PGlite: el puerto
// llama a las mismas funciones `ef_*` que usa supabase-js, como service_role.
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite } from "@electric-sql/pglite";
import type { AuthPort } from "../../supabase/functions/_shared/auth";
import { fromDbError } from "../../supabase/functions/_shared/sql-errors";
import {
  type ActivateSubscriptionPort,
  createHandler as activateHandler,
  type Subscription,
} from "../../supabase/functions/activate-subscription/handler";
import {
  type CardSummary,
  type ReviewState,
  type ReviewStepsPort,
  createHandler as reviewHandler,
} from "../../supabase/functions/review-steps/handler";
import { asService, asUser, createDb, createUser } from "../db/harness";

let db: PGlite;
const ids: Record<string, string> = {};
const NOW = new Date("2026-09-29T15:00:00Z");

async function one(sql: string, params: unknown[] = []): Promise<string> {
  const { rows } = await db.query<{ id: string }>(sql, params);
  return rows[0].id;
}

/** Corre `sql` como service_role y **confirma** (a diferencia de `asService`). */
async function svc<T>(sql: string, params: unknown[]): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    const { rows } = await tx.query<{ r: T }>(sql, params);
    return rows[0].r;
  });
}

/** Igual que supabase-js: el error de Postgres llega como `{ code, message }`. */
async function rpc<T>(sql: string, params: unknown[]): Promise<T> {
  try {
    return await svc<T>(sql, params);
  } catch (error) {
    const e = error as { code?: string; message: string };
    throw fromDbError({ code: e.code, message: e.message });
  }
}

const activatePort: ActivateSubscriptionPort = {
  activate: (user, slug) =>
    rpc<Subscription>("select public.ef_activate_subscription($1, $2) as r", [
      user,
      slug,
    ]),
};

const reviewPort: ReviewStepsPort = {
  loadState: (user, steps) =>
    rpc<ReviewState>("select public.ef_review_state($1, $2) as r", [
      user,
      steps,
    ]),
  apply: async (user, write) =>
    (
      await rpc<{ cards: CardSummary[] }>(
        "select public.ef_review_steps($1, $2) as r",
        [user, JSON.stringify(write)],
      )
    ).cards,
};

/** Puerto de auth falso: el token es el id del usuario. */
const auth: AuthPort = { userIdFromJwt: async (jwt) => jwt };

const activate = activateHandler({ auth, data: activatePort });
const review = reviewHandler({ auth, data: reviewPort, now: () => NOW });

function post(user: string, body: unknown): Request {
  return new Request("http://localhost/fn", {
    method: "POST",
    headers: { Authorization: `Bearer ${user}` },
    body: JSON.stringify(body),
  });
}

async function call(
  handler: (req: Request) => Promise<Response>,
  user: string,
  body: unknown,
) {
  const res = await handler(post(user, body));
  // biome-ignore lint/suspicious/noExplicitAny: respuesta JSON de prueba
  return { status: res.status, body: (await res.json()) as any };
}

const count = async (sql: string, params: unknown[]) =>
  Number(
    (await db.query<{ n: number }>(`select count(*)::int as n ${sql}`, params))
      .rows[0].n,
  );

beforeAll(async () => {
  db = await createDb();
  ids.ana = await createUser(db, "ana@example.com");
  ids.beto = await createUser(db, "beto@example.com");
  ids.sinSub = await createUser(db, "sin@example.com");
  await db.query(
    "update public.profiles set dance_role = 'follower' where id = $1",
    [ids.ana],
  );

  await db.exec("begin");
  ids.salsa = await one(
    "insert into public.dance_styles (slug, name, spoken_beats) values ('salsa-casino', 'Salsa casino', '{1,2,3,5,6,7}') returning id",
  );
  ids.merengue = await one(
    "insert into public.dance_styles (slug, name, spoken_beats, has_roles) values ('merengue', 'Merengue', '{1,2,3,4,5,6,7,8}', false) returning id",
  );
  for (const style of ["salsa", "merengue"]) {
    ids[`pos_${style}`] = await one(
      "insert into public.positions (style_id, slug, name) values ($1, 'cerrada', 'Cerrada') returning id",
      [ids[style]],
    );
    await db.query(
      "update public.dance_styles set start_position_id = $1, published = true where id = $2",
      [ids[`pos_${style}`], ids[style]],
    );
  }
  await db.exec("commit");

  const step = (style: string, slug: string) =>
    one(
      `insert into public.steps (style_id, slug, name, category, difficulty, start_position_id, end_position_id, published)
       values ($1, $2, $2, 'figura', 2, $3, $3, true) returning id`,
      [ids[style], slug, ids[`pos_${style}`]],
    );
  ids.enchufla = await step("salsa", "enchufla");
  ids.dile = await step("salsa", "dile-que-no");
  ids.sombrero = await step("salsa", "sombrero");
  ids.paseo = await step("merengue", "paseo");

  const song = (title: string) =>
    one(
      `insert into public.songs (title, artist, audio_path, duration_ms, dance_end_ms, beat_grid, license_source, license_document_path, published)
       values ($1, 'Artista', 'x.m4a', 300000, 290000, '[{"beat":0,"tMs":0},{"beat":8,"tMs":2600}]', 'Permiso', 'lic.pdf', true) returning id`,
      [title],
    );
  ids.practica = await song("Práctica");
  ids.final = await song("Final");

  ids.curso = await one(
    "insert into public.courses (style_id, title) values ($1, 'Curso') returning id",
    [ids.salsa],
  );
  ids.unidad = await one(
    "insert into public.course_units (course_id, position, title) values ($1, 1, 'Unidad 1') returning id",
    [ids.curso],
  );
  ids.leccion = await one(
    "insert into public.lessons (unit_id, position, title, practice_song_id, final_song_id) values ($1, 1, 'Lección 1', $2, $3) returning id",
    [ids.unidad, ids.practica, ids.final],
  );

  const session = (user: string, songId: string, lesson: string | null) =>
    one(
      `insert into public.practice_sessions (user_id, style_id, song_id, mode, lesson_id, seed, phrases_available, plan)
       values ($1, $2, $3, $4, $5, 42, 12, '[]') returning id`,
      [user, ids.salsa, songId, lesson ? "lesson" : "free", lesson],
    );
  ids.sesionLibre = await session(ids.ana, ids.practica, null);
  ids.sesionPractica = await session(ids.ana, ids.practica, ids.leccion);
  ids.sesionFinal = await session(ids.ana, ids.final, ids.leccion);
  ids.sesionBeto = await session(ids.beto, ids.practica, null);

  // Ana y Beto con suscripción (vía la función, como en producción).
  await svc("select public.ef_activate_subscription($1, 'basico') as r", [
    ids.ana,
  ]);
  await svc("select public.ef_activate_subscription($1, 'basico') as r", [
    ids.beto,
  ]);
});

describe("permisos", () => {
  for (const fn of [
    "ef_activate_subscription(uuid, text)",
    "ef_review_state(uuid, uuid[])",
    "ef_review_steps(uuid, jsonb)",
  ]) {
    test(`${fn}: solo service_role la ejecuta`, async () => {
      const q = `select has_function_privilege($1, 'public.${fn}', 'execute') as ok`;
      const can = async (role: string) =>
        (await db.query<{ ok: boolean }>(q, [role])).rows[0].ok;
      expect(await can("service_role")).toBe(true);
      expect(await can("authenticated")).toBe(false);
      expect(await can("anon")).toBe(false);
    });
  }

  test("un alumno no puede llamarlas aunque pase su propio id", async () => {
    await expect(
      asUser(db, ids.sinSub, (tx) =>
        tx.query("select public.ef_activate_subscription($1, 'basico')", [
          ids.sinSub,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("activate-subscription", () => {
  test("crea la suscripción placeholder con el precio y período de plans", async () => {
    const user = await createUser(db, "nueva@example.com");
    const res = await call(activate, user, {
      planSlug: "basico",
      priceCents: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body.subscription).toMatchObject({
      plan: "basico",
      status: "active",
      priceCents: 2000,
      currency: "USD",
      billingInterval: "month",
    });
    const { rows } = await db.query<{ provider: string; mes: boolean }>(
      `select provider,
              (current_period_end - current_period_start) = interval '1 month' as mes
         from public.subscriptions where user_id = $1`,
      [user],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].provider).toBe("placeholder");
    expect(rows[0]).toMatchObject({ mes: true });
  });

  test("idempotente: el mismo plan devuelve la activa sin crear otra", async () => {
    const user = await createUser(db, "doble@example.com");
    const a = await call(activate, user, { planSlug: "basico" });
    const b = await call(activate, user, { planSlug: "basico" });
    expect(b.status).toBe(200);
    expect(b.body).toEqual(a.body);
    expect(
      await count("from public.subscriptions where user_id = $1", [user]),
    ).toBe(1);
  });

  test("otro plan con una activa → 409 subscription_exists", async () => {
    const res = await call(activate, ids.ana, { planSlug: "consultoria" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("subscription_exists");
  });

  test("una activa vencida se marca expired y se crea otra", async () => {
    const user = await createUser(db, "vencida@example.com");
    await call(activate, user, { planSlug: "basico" });
    await db.query(
      `update public.subscriptions set current_period_start = now() - interval '2 months',
              current_period_end = now() - interval '1 month' where user_id = $1`,
      [user],
    );
    const res = await call(activate, user, { planSlug: "consultoria" });
    expect(res.status).toBe(200);
    const { rows } = await db.query<{ status: string }>(
      "select status from public.subscriptions where user_id = $1 order by created_at, status",
      [user],
    );
    expect(rows.map((r) => r.status).sort()).toEqual(["active", "expired"]);
  });

  test("plan inexistente o inactivo → 404", async () => {
    const res = await call(activate, ids.sinSub, { planSlug: "oro" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("plan_not_found");
  });
});

describe("review-steps", () => {
  test("sin suscripción → 403 (también en SQL)", async () => {
    const res = await call(review, ids.sinSub, {
      context: "catalog",
      status: [{ stepId: ids.enchufla, status: "learning", role: "leader" }],
    });
    expect(res.status).toBe(403);
    await expect(
      asService(db, (tx) =>
        tx.query("select public.ef_review_steps($1, $2)", [
          ids.sinSub,
          JSON.stringify({ context: "catalog", reviews: [], status: [] }),
        ]),
      ),
    ).rejects.toThrow("no_active_subscription");
  });

  test("sesión de otro alumno → 404 session_not_found", async () => {
    const res = await call(review, ids.ana, {
      context: "practice",
      sessionId: ids.sesionBeto,
      reviews: [
        {
          stepId: ids.enchufla,
          role: "leader",
          rating: 3,
          reviewedAt: NOW.toISOString(),
        },
      ],
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("session_not_found");
  });

  test("paso inexistente → 404 step_not_found", async () => {
    const res = await call(review, ids.ana, {
      context: "catalog",
      status: [{ stepId: crypto.randomUUID(), status: "learning" }],
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("step_not_found");
  });

  test("repaso de práctica: tarjeta, historial y catálogo; reenviar no duplica", async () => {
    const body = {
      context: "practice",
      sessionId: ids.sesionLibre,
      reviews: [
        {
          stepId: ids.dile,
          role: "leader",
          rating: 3,
          reviewedAt: NOW.toISOString(),
        },
      ],
    };
    const first = await call(review, ids.ana, body);
    expect(first.status).toBe(200);
    expect(first.body.cards).toHaveLength(1);
    expect(first.body.cards[0]).toMatchObject({
      stepId: ids.dile,
      role: "leader",
      state: "review",
    });
    const cardBefore = await db.query(
      "select * from public.srs_cards where user_id = $1 and step_id = $2",
      [ids.ana, ids.dile],
    );

    // Mismo envío (y hasta con otra nota): no hay repaso nuevo ni se recalcula la tarjeta.
    const again = await call(review, ids.ana, {
      ...body,
      reviews: [{ ...body.reviews[0], rating: 1 }],
    });
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
    expect(
      await count(
        "from public.step_reviews where user_id = $1 and step_id = $2",
        [ids.ana, ids.dile],
      ),
    ).toBe(1);
    const cardAfter = await db.query(
      "select * from public.srs_cards where user_id = $1 and step_id = $2",
      [ids.ana, ids.dile],
    );
    expect(cardAfter.rows).toEqual(cardBefore.rows);
    const { rows } = await db.query<{ status: string }>(
      "select status from public.user_steps where user_id = $1 and step_id = $2",
      [ids.ana, ids.dile],
    );
    expect(rows[0].status).toBe("learning");
  });

  test("estado del catálogo: aprendiendo, me lo sé (idempotente) y no me lo sé", async () => {
    // Sin rol en la petición: usa el del perfil (follower).
    const learning = await call(review, ids.ana, {
      context: "catalog",
      status: [{ stepId: ids.sombrero, status: "learning" }],
    });
    expect(learning.status).toBe(200);
    expect(learning.body.cards).toEqual([
      expect.objectContaining({ role: "follower", state: "new" }),
    ]);

    const known = {
      context: "catalog",
      status: [{ stepId: ids.sombrero, status: "known" }],
    };
    const k1 = await call(review, ids.ana, known);
    expect(k1.body.cards[0].state).toBe("review");
    const k2 = await call(review, ids.ana, known);
    expect(k2.body).toEqual(k1.body);
    expect(
      await count(
        "from public.step_reviews where user_id = $1 and step_id = $2 and rating = 3",
        [ids.ana, ids.sombrero],
      ),
    ).toBe(1);

    const unknown = await call(review, ids.ana, {
      context: "catalog",
      status: [{ stepId: ids.sombrero, status: "unknown" }],
    });
    expect(unknown.body.cards).toEqual([]);
    expect(
      await count(
        "from public.step_reviews where user_id = $1 and step_id = $2",
        [ids.ana, ids.sombrero],
      ),
    ).toBe(1);
    const { rows } = await db.query<{ status: string }>(
      "select status from public.user_steps where user_id = $1 and step_id = $2",
      [ids.ana, ids.sombrero],
    );
    expect(rows[0].status).toBe("unknown");
  });

  test("estilo sin roles: una sola tarjeta con rol leader, aunque pidan follower", async () => {
    const res = await call(review, ids.ana, {
      context: "catalog",
      status: [{ stepId: ids.paseo, status: "learning", role: "follower" }],
    });
    expect(res.status).toBe(200);
    expect(res.body.cards).toEqual([
      expect.objectContaining({ stepId: ids.paseo, role: "leader" }),
    ]);
    // Defensa en SQL: un rol distinto de leader en un estilo sin roles no entra.
    await expect(
      asService(db, (tx) =>
        tx.query("select public.ef_review_steps($1, $2)", [
          ids.ana,
          JSON.stringify({
            context: "catalog",
            reviews: [],
            status: [
              { stepId: ids.paseo, status: "unknown", role: "follower" },
            ],
          }),
        ]),
      ),
    ).rejects.toThrow("invalid_role");
  });

  test("lesson_progress solo con la práctica final de la lección", async () => {
    const graded = (sessionId: string) =>
      call(review, ids.ana, {
        context: "lesson",
        lessonId: ids.leccion,
        sessionId,
        reviews: [
          {
            stepId: ids.enchufla,
            role: "follower",
            rating: 4,
            reviewedAt: NOW.toISOString(),
          },
        ],
      });
    const progress = () =>
      count(
        "from public.lesson_progress where user_id = $1 and lesson_id = $2",
        [ids.ana, ids.leccion],
      );

    expect((await graded(ids.sesionPractica)).status).toBe(200);
    expect(await progress()).toBe(0);
    expect((await graded(ids.sesionFinal)).status).toBe(200);
    expect(await progress()).toBe(1);
    expect((await graded(ids.sesionFinal)).status).toBe(200);
    expect(await progress()).toBe(1);
  });

  test("sesión que no es de la lección → 400 session_lesson_mismatch", async () => {
    const res = await call(review, ids.ana, {
      context: "lesson",
      lessonId: ids.leccion,
      sessionId: ids.sesionLibre,
      reviews: [
        {
          stepId: ids.enchufla,
          role: "leader",
          rating: 3,
          reviewedAt: NOW.toISOString(),
        },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("session_lesson_mismatch");
  });
});
