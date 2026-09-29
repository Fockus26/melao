// plan-session de punta a punta contra PGlite con el seed (migración
// 20260929180000_plan_session.sql): el puerto llama a las mismas funciones `ef_*` que usa
// supabase-js, como service_role. Canciones del seed = sin publicar (D054): solo el admin.
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite } from "@electric-sql/pglite";
import type { AuthPort } from "../../supabase/functions/_shared/auth";
import { fromDbError } from "../../supabase/functions/_shared/sql-errors";
import {
  createHandler,
  type PlanSessionPort,
  type PlanSessionState,
} from "../../supabase/functions/plan-session/handler";
import { applySeed, asUser, createDb, createUser } from "../db/harness";

const SALSA = "a0000000-0000-4000-8000-000000000001";
const MERENGUE = "a0000000-0000-4000-8000-000000000002";
const SONG_1 = "c0000000-0000-4000-8000-000000000001";
const SONG_4 = "c0000000-0000-4000-8000-000000000004";
const LESSON_1 = "d2000000-0000-4000-8000-000000000111"; // La guapea
const LESSON_3 = "d2000000-0000-4000-8000-000000000113"; // Primeras vueltas
const NOW = new Date();

let db: PGlite;
const ids: Record<string, string> = {};

/** Corre `sql` como service_role y confirma. */
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

const port: PlanSessionPort = {
  loadState: (user, { styleId, songId, lessonId }) =>
    rpc<PlanSessionState>(
      "select public.ef_plan_session_state($1, $2, $3, $4) as r",
      [user, styleId, songId, lessonId],
    ),
  createSession: async (user, write) =>
    (
      await rpc<{ sessionId: string }>(
        "select public.ef_plan_session($1, $2) as r",
        [user, JSON.stringify(write)],
      )
    ).sessionId,
};

const auth: AuthPort = { userIdFromJwt: async (jwt) => jwt };
const handler = createHandler({
  auth,
  data: port,
  now: () => NOW,
  randomSeed: () => 777,
});

async function call(user: string, body: unknown) {
  const res = await handler(
    new Request("http://localhost/plan-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${user}` },
      body: JSON.stringify(body),
    }),
  );
  // biome-ignore lint/suspicious/noExplicitAny: respuesta JSON de prueba
  return { status: res.status, body: (await res.json()) as any };
}

const count = async (sql: string, params: unknown[]) =>
  Number(
    (await db.query<{ n: number }>(`select count(*)::int as n ${sql}`, params))
      .rows[0].n,
  );

const stepId = async (style: string, slug: string) =>
  (
    await db.query<{ id: string }>(
      "select id from public.steps where style_id = $1 and slug = $2",
      [style, slug],
    )
  ).rows[0].id;

beforeAll(async () => {
  db = await createDb();
  await applySeed(db);
  ids.admin = await createUser(db, "admin@example.com");
  ids.ana = await createUser(db, "ana@example.com");
  ids.sinSub = await createUser(db, "sin@example.com");
  await db.query(
    "update public.profiles set app_role = 'admin' where id = $1",
    [ids.admin],
  );
  await db.query(
    "update public.profiles set dance_role = 'follower' where id = any($1)",
    [[ids.admin, ids.ana]],
  );
  for (const u of [ids.admin, ids.ana]) {
    await svc("select public.ef_activate_subscription($1, 'basico') as r", [u]);
  }
  // Ana sabe la guapea, el Dile que sí y la enchufla; la enchufla vencida (rol follower).
  const guapea = await stepId(SALSA, "guapea");
  const dileQueSi = await stepId(SALSA, "dile-que-si");
  const enchufla = await stepId(SALSA, "enchufla");
  await db.query(
    "insert into public.user_steps (user_id, step_id, status) select $1, unnest($2::uuid[]), 'known'",
    [ids.ana, [guapea, dileQueSi, enchufla]],
  );
  await db.query(
    `insert into public.srs_cards (user_id, step_id, role, state, stability, difficulty, due_at, last_review_at, reps)
     values ($1, $2, 'follower', 'review', 3, 6.5, now() - interval '2 days', now() - interval '5 days', 2),
            ($1, $2, 'leader', 'review', 3, 9, now() + interval '9 days', now() - interval '5 days', 2)`,
    [ids.ana, enchufla],
  );
});

describe("permisos", () => {
  for (const fn of [
    "ef_plan_session_state(uuid, uuid, uuid, uuid)",
    "ef_plan_session(uuid, jsonb)",
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

  test("un alumno no puede registrar una sesión aunque pase su propio id", async () => {
    await expect(
      asUser(db, ids.ana, (tx) =>
        tx.query("select public.ef_plan_session($1, '{}'::jsonb)", [ids.ana]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("ef_plan_session_state", () => {
  test("estado del alumno: rol de las tarjetas, favoritos y lección", async () => {
    const st = await port.loadState(ids.ana, {
      styleId: SALSA,
      songId: SONG_1,
      lessonId: LESSON_3,
    });
    expect(st.activeSubscription).toBe(true);
    expect(st.isAdmin).toBe(false);
    expect(st.style?.startPosition).toBeString();
    expect(st.song).toMatchObject({ visible: false, inStyle: true });
    // Lección 3 bloqueada: la 2 no está completada.
    expect(st.lesson).toMatchObject({
      styleId: SALSA,
      visible: true,
      unlocked: false,
    });
    const enchufla = st.steps.find((s) => s.slug === "enchufla");
    // Solo la tarjeta del rol del perfil (follower): vencida, dificultad 6.5.
    expect(enchufla?.status).toBe("known");
    expect(enchufla?.card?.difficulty).toBe(6.5);
    expect(new Date(enchufla?.card?.dueAt ?? 0).getTime()).toBeLessThan(
      Date.now(),
    );
    expect(st.steps.find((s) => s.slug === "setenta")?.card).toBeNull();
  });

  test("lección desbloqueada: la primera del curso, o la anterior completada", async () => {
    const load = (lessonId: string) =>
      port.loadState(ids.ana, { styleId: SALSA, songId: SONG_1, lessonId });
    expect((await load(LESSON_1)).lesson?.unlocked).toBe(true);
    const l2 = "d2000000-0000-4000-8000-000000000112";
    await db.query(
      "insert into public.lesson_progress (user_id, lesson_id) values ($1, $2)",
      [ids.ana, l2],
    );
    expect((await load(LESSON_3)).lesson?.unlocked).toBe(true);
    await db.query(
      "delete from public.lesson_progress where user_id = $1 and lesson_id = $2",
      [ids.ana, l2],
    );
  });

  test("sin lección ni estilo: null", async () => {
    const st = await port.loadState(ids.ana, {
      styleId: "00000000-0000-4000-8000-000000000000",
      songId: SONG_1,
      lessonId: null,
    });
    expect(st.style).toBeNull();
    expect(st.lesson).toBeNull();
    expect(st.song?.inStyle).toBe(false);
  });
});

describe("plan-session", () => {
  test("alumno con canción sin publicar (seed) → 404 song_not_found", async () => {
    const res = await call(ids.ana, {
      styleId: SALSA,
      songId: SONG_1,
      mode: "free",
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("song_not_found");
  });

  test("sin suscripción → 403", async () => {
    const res = await call(ids.sinSub, {
      styleId: SALSA,
      songId: SONG_1,
      mode: "free",
    });
    expect(res.status).toBe(403);
  });

  test("el admin planea una lección sobre el seed y la sesión queda registrada", async () => {
    const before = await count("from public.practice_sessions", []);
    const res = await call(ids.admin, {
      styleId: SALSA,
      songId: SONG_1,
      mode: "lesson",
      lessonId: LESSON_3,
    });
    expect(res.status).toBe(200);
    const { sessionId, seed, plan, phrasesAvailable, unplaced, timeline } =
      res.body;
    expect(seed).toBe(777);
    expect(unplaced).toEqual([]);
    expect(timeline.length).toBeGreaterThan(0);
    expect(
      plan.reduce((n: number, p: { phrases: number }) => n + p.phrases, 0),
    ).toBe(phrasesAvailable);
    expect(await count("from public.practice_sessions", [])).toBe(before + 1);

    const { rows } = await db.query<{
      user_id: string;
      mode: string;
      lesson_id: string;
      seed: string;
      phrases_available: number;
      plan: unknown;
    }>("select * from public.practice_sessions where id = $1", [sessionId]);
    expect(rows[0]).toMatchObject({
      user_id: ids.admin,
      mode: "lesson",
      lesson_id: LESSON_3,
      phrases_available: phrasesAvailable,
      plan,
    });
    expect(Number(rows[0].seed)).toBe(777);
    // Un practice_session_steps por paso distinto, con la suma de sus frases.
    const { rows: steps } = await db.query<{
      step_id: string;
      phrases: number;
    }>(
      "select step_id, phrases from public.practice_session_steps where session_id = $1",
      [sessionId],
    );
    const totals = new Map<string, number>();
    for (const p of plan as { stepId: string; phrases: number }[]) {
      totals.set(p.stepId, (totals.get(p.stepId) ?? 0) + p.phrases);
    }
    expect(new Map(steps.map((s) => [s.step_id, s.phrases]))).toEqual(totals);
    // La lección 3 fija vuelta-derecha y enchufla: las dos están en el plan.
    const inPlan = new Set(plan.map((p: { stepId: string }) => p.stepId));
    expect(inPlan.has(await stepId(SALSA, "vuelta-derecha"))).toBe(true);
    expect(inPlan.has(await stepId(SALSA, "enchufla"))).toBe(true);
  });

  test("misma semilla → mismo plan y timeline (dos sesiones distintas)", async () => {
    const body = {
      styleId: MERENGUE,
      songId: SONG_4,
      mode: "lesson",
      lessonId: "d2000000-0000-4000-8000-000000000211",
      seed: 31337,
    };
    const a = await call(ids.admin, body);
    const b = await call(ids.admin, body);
    expect(a.status).toBe(200);
    expect(b.body.sessionId).not.toBe(a.body.sessionId);
    expect(b.body.plan).toEqual(a.body.plan);
    expect(b.body.timeline).toEqual(a.body.timeline);
  });

  test("canción de otro estilo → 404; lección de otro estilo → 404", async () => {
    const song = await call(ids.admin, {
      styleId: MERENGUE,
      songId: SONG_1,
      mode: "free",
    });
    expect(song.body.error.code).toBe("song_not_found");
    const lesson = await call(ids.admin, {
      styleId: MERENGUE,
      songId: SONG_4,
      mode: "lesson",
      lessonId: LESSON_1,
    });
    expect(lesson.body.error.code).toBe("lesson_not_found");
  });

  test("mini práctica de la enchufla: practice_phrases frases, con el Dile que sí para llegar", async () => {
    const enchufla = await stepId(SALSA, "enchufla");
    const res = await call(ids.admin, {
      styleId: SALSA,
      songId: SONG_1,
      mode: "lesson",
      lessonId: LESSON_3,
      focusStepId: enchufla,
      seed: 3,
    });
    expect(res.status).toBe(200);
    expect(res.body.phrasesAvailable).toBe(4); // practice_phrases de la lección 3
    expect(res.body.unplaced).toEqual([]);
    const inPlan = new Set(
      res.body.plan.map((p: { stepId: string }) => p.stepId),
    );
    expect(inPlan.has(enchufla)).toBe(true);
    // Nada de la lección que no sea el foco (la vuelta a la derecha queda fuera).
    expect(inPlan.has(await stepId(SALSA, "vuelta-derecha"))).toBe(false);
  });

  test("canción publicada: el alumno practica libre con sus pasos y el vencido entra", async () => {
    // Publicar exige audio y licencia (D009): datos de prueba solo en esta base.
    await db.query(
      `update public.songs set published = true, audio_path = 'songs/prueba.mp3',
         license_source = 'prueba', license_document_path = 'licencias/prueba.pdf'
       where id = $1`,
      [SONG_1],
    );
    const res = await call(ids.ana, {
      styleId: SALSA,
      songId: SONG_1,
      mode: "free",
      seed: 5,
    });
    expect(res.status).toBe(200);
    const enchufla = await stepId(SALSA, "enchufla");
    const allowed = [
      enchufla,
      await stepId(SALSA, "guapea"),
      await stepId(SALSA, "dile-que-si"),
      await stepId(SALSA, "basico-cerrada"),
    ];
    for (const p of res.body.plan as { stepId: string }[]) {
      expect(allowed).toContain(p.stepId);
    }
    expect(
      res.body.plan.some((p: { stepId: string }) => p.stepId === enchufla),
    ).toBe(true);
    // La popularidad cuenta la sesión registrada.
    const { rows } = await db.query<{ n: number }>(
      "select appearances_30d::int as n from public.step_popularity($1) where step_id = $2",
      [SALSA, enchufla],
    );
    expect(rows[0].n).toBeGreaterThan(0);
  });
});
