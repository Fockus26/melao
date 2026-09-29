// plan-session con un puerto falso (sin base de datos): entrada, reglas de visibilidad y de
// lección, elección de pasos y targets, semilla reproducible y línea de tiempo.
import { describe, expect, test } from "bun:test";
import type { AuthPort } from "../../supabase/functions/_shared/auth";
import { generatePlan } from "../../supabase/functions/_shared/core/combinaciones";
import { SALSA_CASINO } from "../../supabase/functions/_shared/core/style";
import { buildTimeline } from "../../supabase/functions/_shared/core/timeline";
import {
  createHandler,
  cryptoSeed,
  type Input,
  MAX_SEED,
  type PlanSessionPort,
  type PlanSessionState,
  parseInput,
  planSession,
  type SessionWrite,
  type StepState,
} from "../../supabase/functions/plan-session/handler";

type Style = NonNullable<PlanSessionState["style"]>;
type Song = NonNullable<PlanSessionState["song"]>;

const NOW = new Date("2026-09-29T15:00:00Z");
const U = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const STYLE = U(1);
const SONG = U(2);
const LESSON = U(3);
const G = U(10); // guapea
const C = U(11); // cerrada

function step(
  n: number,
  slug: string,
  from: string,
  to: string,
  extra: Partial<StepState> = {},
): StepState {
  return {
    id: U(n),
    slug,
    published: true,
    category: "figura",
    difficulty: 2,
    startPosition: from,
    endPosition: to,
    phrases: 1,
    canStart: false,
    canEnd: false,
    repeatable: false,
    status: "known",
    favorite: false,
    card: null,
    popularity: null,
    ...extra,
  };
}

const GUAPEA = step(20, "guapea", G, G, {
  category: "base",
  canStart: true,
  canEnd: true,
  difficulty: 1,
});
const BASICO_CERRADA = step(21, "basico-cerrada", C, C, {
  category: "base",
  difficulty: 1,
});
const DILE_QUE_SI = step(22, "dile-que-si", G, C, { canStart: true });
const DILE_QUE_NO = step(23, "dile-que-no", C, G, { canEnd: true });
const ENCHUFLA = step(24, "enchufla", G, G, {
  canStart: true,
  canEnd: true,
  difficulty: 3,
});
const SETENTA = step(25, "setenta", G, G, {
  phrases: 3,
  canEnd: true,
  difficulty: 4,
  status: "unknown",
});

/** 250 ms por beat, beat 0 en 2000 ms: t(-8) = 0 (sin desplazamiento); 12 frases. */
function state(over: Partial<PlanSessionState> = {}): PlanSessionState {
  return {
    activeSubscription: true,
    isAdmin: false,
    style: {
      id: STYLE,
      published: true,
      hasRoles: true,
      startPosition: G,
      ...SALSA_CASINO,
      spokenBeats: [...SALSA_CASINO.spokenBeats],
    },
    song: {
      id: SONG,
      visible: true,
      inStyle: true,
      beatGrid: [
        { beat: 0, tMs: 2000 },
        { beat: 8, tMs: 4000 },
      ],
      danceEndMs: 2000 + 250 * 8 * 12,
    },
    lesson: {
      id: LESSON,
      styleId: STYLE,
      visible: true,
      unlocked: true,
      practiceSongId: SONG,
      practicePhrases: 4,
      stepIds: [ENCHUFLA.id, SETENTA.id],
      previousStepIds: [],
    },
    steps: [
      GUAPEA,
      BASICO_CERRADA,
      DILE_QUE_SI,
      DILE_QUE_NO,
      ENCHUFLA,
      SETENTA,
    ],
    ...over,
  };
}

const free: Input = { styleId: STYLE, songId: SONG, mode: "free" };
const lesson: Input = {
  styleId: STYLE,
  songId: SONG,
  mode: "lesson",
  lessonId: LESSON,
};

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return (error as { code: string }).code;
  }
  return "sin error";
}

describe("plan-session: entrada", () => {
  test("válida: los opcionales ausentes quedan fuera", () => {
    expect(parseInput({ ...free, seed: 7 })).toEqual({
      ...free,
      lessonId: undefined,
      focusStepId: undefined,
      stepFilters: undefined,
      seed: 7,
    });
    expect(
      parseInput({ ...free, stepFilters: { maxDifficulty: 3 } }),
    ).toMatchObject({
      stepFilters: { maxDifficulty: 3 },
    });
  });

  const bad: [string, unknown][] = [
    ["styleId no uuid", { ...free, styleId: "salsa" }],
    ["mode desconocido", { ...free, mode: "repaso" }],
    ["lesson sin lessonId", { ...lesson, lessonId: undefined }],
    ["free con lessonId", { ...free, lessonId: LESSON }],
    ["free con focusStepId", { ...free, focusStepId: ENCHUFLA.id }],
    ["lesson con stepFilters", { ...lesson, stepFilters: {} }],
    ["seed negativa", { ...free, seed: -1 }],
    ["seed > uint32", { ...free, seed: MAX_SEED + 1 }],
    ["seed decimal", { ...free, seed: 1.5 }],
    ["dificultad fuera de 1–5", { ...free, stepFilters: { maxDifficulty: 6 } }],
    [
      "min > max",
      { ...free, stepFilters: { minDifficulty: 4, maxDifficulty: 2 } },
    ],
    [
      "favoritesOnly no booleano",
      { ...free, stepFilters: { favoritesOnly: "sí" } },
    ],
  ];
  for (const [name, body] of bad) {
    test(`${name} → invalid_input`, () => {
      expect(codeOf(() => parseInput(body))).toBe("invalid_input");
    });
  }

  test("la semilla del servidor es un uint32", () => {
    for (let i = 0; i < 20; i++) {
      const s = cryptoSeed();
      expect(Number.isInteger(s) && s >= 0 && s <= MAX_SEED).toBe(true);
    }
  });
});

describe("plan-session: reglas", () => {
  const run = (input: Input, st: PlanSessionState) => () =>
    planSession(input, st, NOW, 1);

  test("estilo inexistente o sin publicar (alumno) → 404 style_not_found", () => {
    expect(codeOf(run(free, state({ style: null })))).toBe("style_not_found");
    const s = state();
    const hidden = state({
      style: { ...(s.style as Style), published: false },
    });
    expect(codeOf(run(free, hidden))).toBe("style_not_found");
    expect(codeOf(run(free, { ...hidden, isAdmin: true }))).toBe("sin error");
  });

  test("canción no publicada: el alumno recibe 404, el admin puede planear (D063)", () => {
    const s = state();
    const draft = state({ song: { ...(s.song as Song), visible: false } });
    expect(codeOf(run(free, draft))).toBe("song_not_found");
    expect(codeOf(run(free, { ...draft, isAdmin: true }))).toBe("sin error");
  });

  test("canción de otro estilo → 404 song_not_found (también para el admin)", () => {
    const s = state({ isAdmin: true });
    const other = { ...s, song: { ...(s.song as Song), inStyle: false } };
    expect(codeOf(run(free, other))).toBe("song_not_found");
  });

  test("canción sin rejilla o sin final → 409 song_not_ready", () => {
    const s = state();
    const song = s.song as NonNullable<PlanSessionState["song"]>;
    for (const broken of [
      { ...song, beatGrid: null },
      { ...song, beatGrid: [{ beat: 0, tMs: 0 }] },
      { ...song, danceEndMs: null },
    ]) {
      expect(codeOf(run(free, state({ song: broken })))).toBe("song_not_ready");
    }
  });

  test("canción donde no cabe una frase → 409 song_too_short", () => {
    const s = state();
    const song = { ...(s.song as Song), danceEndMs: 3000 };
    expect(codeOf(run(free, state({ song })))).toBe("song_too_short");
  });

  test("lección de otro estilo, oculta o inexistente → 404; bloqueada → 403 (salvo admin)", () => {
    const s = state();
    const l = s.lesson as NonNullable<PlanSessionState["lesson"]>;
    expect(codeOf(run(lesson, state({ lesson: null })))).toBe(
      "lesson_not_found",
    );
    expect(
      codeOf(run(lesson, state({ lesson: { ...l, styleId: U(99) } }))),
    ).toBe("lesson_not_found");
    expect(
      codeOf(run(lesson, state({ lesson: { ...l, visible: false } }))),
    ).toBe("lesson_not_found");
    const locked = state({ lesson: { ...l, unlocked: false } });
    expect(codeOf(run(lesson, locked))).toBe("lesson_locked");
    expect(codeOf(run(lesson, { ...locked, isAdmin: true }))).toBe("sin error");
  });

  test("focusStepId que no es de la lección → 400 invalid_input", () => {
    expect(
      codeOf(run({ ...lesson, focusStepId: DILE_QUE_SI.id }, state())),
    ).toBe("invalid_input");
  });

  test("práctica libre sin pasos que cumplan los filtros → 409 no_steps", () => {
    expect(
      codeOf(run({ ...free, stepFilters: { favoritesOnly: true } }, state())),
    ).toBe("no_steps");
  });

  test("sin combinación posible → 409 no_plan", () => {
    // Solo pasos de 2 frases y N impar (11 frases): no hay plan.
    const s = state();
    const song = {
      ...(s.song as Song),
      danceEndMs: 2000 + 250 * 8 * 11,
    };
    const two = (st: StepState) => ({ ...st, phrases: 2 });
    const st = state({
      song,
      steps: [two(GUAPEA), two(ENCHUFLA)],
    });
    expect(codeOf(run(free, st))).toBe("no_plan");
  });
});

describe("plan-session: plan", () => {
  test("misma semilla → mismo plan y misma línea de tiempo; otra semilla → otro plan", () => {
    const a = planSession(free, state(), NOW, 42);
    const b = planSession(free, state(), NOW, 42);
    expect(b.plan).toEqual(a.plan);
    expect(b.timeline).toEqual(a.timeline);
    const plans = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
        JSON.stringify(planSession(free, state(), NOW, seed).plan),
      ),
    );
    expect(plans.size).toBeGreaterThan(1);
  });

  test("el plan cubre N frases contiguas y la línea de tiempo es la del core", () => {
    const r = planSession(free, state(), NOW, 42);
    expect(r.phrasesAvailable).toBe(12);
    expect(r.plan[0].startPhrase).toBe(0);
    let next = 0;
    for (const item of r.plan) {
      expect(item.startPhrase).toBe(next);
      next += item.phrases;
    }
    expect(next).toBe(12);
    const slugs = new Map(state().steps.map((s) => [s.id, s.slug]));
    const st = state().style as NonNullable<PlanSessionState["style"]>;
    expect(r.timeline).toEqual(
      buildTimeline(
        st,
        state().song?.beatGrid ?? [],
        r.plan.map((p) => ({ ...p, slug: slugs.get(p.stepId) as string })),
      ),
    );
  });

  test("libre: solo pasos sabidos (y base de relleno); los vencidos son targets", () => {
    const due = { dueAt: "2026-09-28T00:00:00Z", difficulty: 6 };
    const st = state({
      steps: [
        GUAPEA,
        BASICO_CERRADA,
        DILE_QUE_SI,
        DILE_QUE_NO,
        { ...ENCHUFLA, status: "learning", card: due },
        SETENTA,
      ],
    });
    for (let seed = 0; seed < 30; seed++) {
      const r = planSession(free, st, NOW, seed);
      const ids = new Set(r.plan.map((p) => p.stepId));
      expect(ids.has(SETENTA.id)).toBe(false); // "no lo sé"
      expect(ids.has(ENCHUFLA.id)).toBe(true); // vencido → target
      expect(r.unplaced).toEqual([]);
    }
    // Sin "aprendiendo", la enchufla no entra.
    const r = planSession(
      { ...free, stepFilters: { includeLearning: false } },
      st,
      NOW,
      3,
    );
    expect(r.plan.some((p) => p.stepId === ENCHUFLA.id)).toBe(false);
    expect(r.write.filters).toEqual({ includeLearning: false });
  });

  test("pesos: vencido, dificultad FSRS, favorito y popularidad llegan al generador", () => {
    const st = state({
      steps: [
        GUAPEA,
        { ...ENCHUFLA, favorite: true, popularity: 0.5 },
        {
          ...DILE_QUE_SI,
          card: { dueAt: "2026-10-05T00:00:00Z", difficulty: 4 },
        },
        DILE_QUE_NO,
        BASICO_CERRADA,
      ],
    });
    const r = planSession(free, st, NOW, 9);
    // Reproducimos la llamada al core con los pesos esperados.
    const combo = (s: StepState) => ({
      id: s.id,
      startPosition: s.startPosition,
      endPosition: s.endPosition,
      phrases: s.phrases,
      canStart: s.canStart,
      canEnd: s.canEnd,
      repeatable: s.repeatable,
    });
    const expected = generatePlan({
      phrases: 12,
      steps: st.steps.map(combo),
      baseSteps: [GUAPEA, BASICO_CERRADA].map(combo),
      startPosition: G,
      targets: [],
      weights: {
        [ENCHUFLA.id]: { favorite: true, popularity: 0.5 },
        [DILE_QUE_SI.id]: { difficulty: 4 },
      },
      seed: 9,
      startPhrase: 0,
    });
    expect(r.plan).toEqual(expected.plan);
  });

  test("lección: sus pasos son targets en orden; entran también los sabidos", () => {
    const r = planSession(lesson, state(), NOW, 5);
    const ids = r.plan.map((p) => p.stepId);
    expect(ids).toContain(ENCHUFLA.id);
    expect(ids).toContain(SETENTA.id); // "no lo sé", pero es de la lección
    expect(r.unplaced).toEqual([]);
    expect(r.write.lessonId).toBe(LESSON);
    expect(r.write.mode).toBe("lesson");
  });

  test("mini práctica (focusStepId): ese paso y base, con practicePhrases frases", () => {
    const r = planSession(
      { ...lesson, focusStepId: ENCHUFLA.id },
      state(),
      NOW,
      5,
    );
    expect(r.phrasesAvailable).toBe(4);
    expect(r.plan.reduce((n, p) => n + p.phrases, 0)).toBe(4);
    expect(
      r.plan.every((p) => p.stepId === ENCHUFLA.id || p.stepId === GUAPEA.id),
    ).toBe(true);
    expect(r.plan.some((p) => p.stepId === ENCHUFLA.id)).toBe(true);
    expect(r.write.filters).toEqual({ focusStepId: ENCHUFLA.id });
  });

  test("intro corta: la frase 0 hace de entrada y el plan empieza en la 1 (D039)", () => {
    const s = state();
    // Beat 0 en 1000 ms: t(-8) = -1000 < 0 → startPhrase 1, N = 12 − 1.
    const song = {
      ...(s.song as Song),
      beatGrid: [
        { beat: 0, tMs: 1000 },
        { beat: 8, tMs: 3000 },
      ],
      danceEndMs: 1000 + 250 * 8 * 12,
    };
    const r = planSession(free, state({ song }), NOW, 1);
    expect(r.plan[0].startPhrase).toBe(1);
    expect(r.phrasesAvailable).toBe(11);
    const first = r.timeline[0];
    expect(first).toMatchObject({ beat: 0, kind: "count", stepId: null });
  });

  test("el registro suma las frases por paso distinto", () => {
    const r = planSession(free, state(), NOW, 42);
    const total = r.write.steps.reduce((n, s) => n + s.phrases, 0);
    expect(total).toBe(12);
    expect(new Set(r.write.steps.map((s) => s.stepId)).size).toBe(
      r.write.steps.length,
    );
    expect(r.write.plan).toEqual(r.plan);
  });
});

describe("plan-session: handler", () => {
  const auth: AuthPort = { userIdFromJwt: async (jwt) => jwt };
  function setup(st: PlanSessionState) {
    const writes: SessionWrite[] = [];
    let loads = 0;
    const data: PlanSessionPort = {
      loadState: async () => {
        loads++;
        return st;
      },
      createSession: async (_user, write) => {
        writes.push(write);
        return U(500);
      },
    };
    const handler = createHandler({
      auth,
      data,
      now: () => NOW,
      randomSeed: () => 1234,
    });
    const call = async (body: unknown, user: string | null = U(77)) => {
      const res = await handler(
        new Request("http://localhost/plan-session", {
          method: "POST",
          headers: user ? { Authorization: `Bearer ${user}` } : {},
          body: JSON.stringify(body),
        }),
      );
      // biome-ignore lint/suspicious/noExplicitAny: respuesta JSON de prueba
      return { status: res.status, body: (await res.json()) as any };
    };
    return { call, writes, loads: () => loads };
  }

  test("sin sesión → 401; sin suscripción → 403 sin escribir", async () => {
    const a = setup(state());
    expect((await a.call(free, null)).status).toBe(401);
    const b = setup(state({ activeSubscription: false }));
    const res = await b.call(free);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("no_active_subscription");
    expect(b.writes).toEqual([]);
  });

  test("entrada inválida → 400 sin leer datos", async () => {
    const a = setup(state());
    expect((await a.call({ ...free, mode: "x" })).status).toBe(400);
    expect(a.loads()).toBe(0);
  });

  test("sin seed: la genera el servidor, la guarda y la devuelve", async () => {
    const a = setup(state());
    const res = await a.call(free);
    expect(res.status).toBe(200);
    expect(res.body.seed).toBe(1234);
    expect(a.writes[0].seed).toBe(1234);
    expect(Object.keys(res.body).sort()).toEqual([
      "phrasesAvailable",
      "plan",
      "seed",
      "sessionId",
      "timeline",
      "unplaced",
    ]);
    expect(res.body.sessionId).toBe(U(500));
  });

  test("con seed: respuesta reproducible", async () => {
    const a = setup(state());
    const one = await a.call({ ...free, seed: 99 });
    const two = await a.call({ ...free, seed: 99 });
    expect(two.body.plan).toEqual(one.body.plan);
    expect(two.body.timeline).toEqual(one.body.timeline);
    expect(a.writes.map((w) => w.seed)).toEqual([99, 99]);
  });

  test("regla rota → su código HTTP y nada escrito", async () => {
    const s = state();
    const a = setup(
      state({
        song: { ...(s.song as Song), beatGrid: null },
      }),
    );
    const res = await a.call(free);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("song_not_ready");
    expect(a.writes).toEqual([]);
  });
});
