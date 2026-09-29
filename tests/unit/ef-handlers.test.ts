// Handlers de activate-subscription y review-steps con puertos falsos: entrada, auth,
// forma de la respuesta y el cálculo que se manda a SQL.
import { describe, expect, test } from "bun:test";
import type { AuthPort } from "../../supabase/functions/_shared/auth";
import {
  markLearning,
  reviewCard,
} from "../../supabase/functions/_shared/core/srs";
import { createHandler as activateHandler } from "../../supabase/functions/activate-subscription/handler";
import {
  buildWrite,
  parseInput,
  type ReviewState,
  type ReviewStepsPort,
  type ReviewWrite,
  createHandler as reviewHandler,
} from "../../supabase/functions/review-steps/handler";

const USER = "11111111-1111-4111-8111-111111111111";
const STEP = "22222222-2222-4222-8222-222222222222";
const STEP2 = "33333333-3333-4333-8333-333333333333";
const SESSION = "44444444-4444-4444-8444-444444444444";
const NOW = new Date("2026-09-29T15:00:00.000Z");

const auth: AuthPort = {
  userIdFromJwt: async (jwt) => (jwt === "valido" ? USER : null),
};

function post(body: unknown, token: string | null = "valido") {
  return new Request("http://x/", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  });
}

async function read(res: Response) {
  // biome-ignore lint/suspicious/noExplicitAny: respuesta JSON de prueba
  return { status: res.status, body: (await res.json()) as any };
}

describe("activate-subscription", () => {
  const calls: [string, string][] = [];
  const handler = activateHandler({
    auth,
    data: {
      async activate(userId, planSlug) {
        calls.push([userId, planSlug]);
        return {
          plan: planSlug,
          status: "active",
          currentPeriodEnd: "2026-10-29T15:00:00+00:00",
          priceCents: 2000,
          currency: "USD",
          billingInterval: "month",
        };
      },
    },
  });

  test("sin Authorization → 401 y no toca datos", async () => {
    const res = await read(await handler(post({ planSlug: "basico" }, null)));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
    expect(calls).toHaveLength(0);
  });

  test("planSlug inválido → 400 invalid_input", async () => {
    for (const body of [{}, { planSlug: 3 }, { planSlug: "Básico" }, []]) {
      const res = await read(await handler(post(body)));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("invalid_input");
    }
  });

  test("el alumno sale del JWT, no del cuerpo; respuesta { subscription }", async () => {
    const res = await read(
      await handler(post({ planSlug: "basico", userId: "otro" })),
    );
    expect(res.status).toBe(200);
    expect(calls.at(-1)).toEqual([USER, "basico"]);
    expect(Object.keys(res.body)).toEqual(["subscription"]);
    expect(res.body.subscription.plan).toBe("basico");
  });
});

describe("review-steps: entrada", () => {
  const review = {
    stepId: STEP,
    role: "leader",
    rating: 3,
    reviewedAt: NOW.toISOString(),
  };
  const invalid: [string, unknown][] = [
    ["sin context", { reviews: [review] }],
    ["nada que registrar", { context: "catalog" }],
    [
      "rating fuera de 1-4",
      { context: "catalog", reviews: [{ ...review, rating: 5 }] },
    ],
    [
      "rating no entero",
      { context: "catalog", reviews: [{ ...review, rating: 2.5 }] },
    ],
    [
      "fecha sin zona",
      {
        context: "catalog",
        reviews: [{ ...review, reviewedAt: "2026-09-29T15:00:00" }],
      },
    ],
    [
      "uuid inválido",
      { context: "catalog", reviews: [{ ...review, stepId: "x" }] },
    ],
    [
      "rol inválido",
      { context: "catalog", reviews: [{ ...review, role: "both" }] },
    ],
    ["práctica sin sesión", { context: "practice", reviews: [review] }],
    [
      "lección sin lessonId",
      { context: "lesson", sessionId: SESSION, reviews: [review] },
    ],
    [
      "paso repetido en status",
      {
        context: "catalog",
        status: [
          { stepId: STEP, status: "known" },
          { stepId: STEP, status: "unknown" },
        ],
      },
    ],
    [
      "paso en reviews y status",
      {
        context: "catalog",
        reviews: [review],
        status: [{ stepId: STEP, status: "known" }],
      },
    ],
  ];
  for (const [name, body] of invalid) {
    test(`${name} → 400`, () => {
      expect(() => parseInput(body)).toThrow();
      try {
        parseInput(body);
      } catch (error) {
        expect(error).toMatchObject({ status: 400 });
      }
    });
  }
});

describe("review-steps: cálculo", () => {
  const state = (over: Partial<ReviewState> = {}): ReviewState => ({
    activeSubscription: true,
    profileRole: "follower",
    steps: [
      { id: STEP, hasRoles: true, status: "learning" },
      { id: STEP2, hasRoles: false, status: "unknown" },
    ],
    cards: [],
    ...over,
  });

  test("repaso sobre tarjeta nueva = reviewCard(markLearning) en reviewedAt", () => {
    const at = new Date("2026-09-29T10:00:00.000Z");
    const write = buildWrite(
      parseInput({
        context: "practice",
        sessionId: SESSION,
        reviews: [
          {
            stepId: STEP,
            role: "leader",
            rating: 2,
            reviewedAt: at.toISOString(),
          },
        ],
      }),
      state(),
      NOW,
    );
    const expected = reviewCard(markLearning(at), 2, at);
    expect(write.reviews[0]).toEqual({
      stepId: STEP,
      role: "leader",
      rating: 2,
      reviewedAt: at.toISOString(),
      dueAfter: expected.card.due_at,
      card: expected.card,
    });
  });

  test("reviewedAt se acota entre el último repaso y ahora", () => {
    const last = "2026-09-20T00:00:00.000Z";
    const card = {
      ...reviewCard(markLearning(new Date(last)), 3, new Date(last)).card,
    };
    const base = state({ cards: [{ ...card, step_id: STEP, role: "leader" }] });
    const at = (reviewedAt: string) =>
      buildWrite(
        parseInput({
          context: "practice",
          sessionId: SESSION,
          reviews: [{ stepId: STEP, role: "leader", rating: 3, reviewedAt }],
        }),
        base,
        NOW,
      ).reviews[0].reviewedAt;
    expect(at("2030-01-01T00:00:00Z")).toBe(NOW.toISOString());
    expect(at("2026-09-01T00:00:00Z")).toBe(last);
  });

  test("roles: estilo sin roles → leader; status sin rol → el del perfil", () => {
    const write = buildWrite(
      parseInput({
        context: "catalog",
        status: [
          { stepId: STEP, status: "learning" },
          { stepId: STEP2, status: "known", role: "follower" },
        ],
      }),
      state(),
      NOW,
    );
    expect(write.status.map((s) => s.role)).toEqual(["follower", "leader"]);
    expect(write.status[0].card).toEqual(markLearning(NOW));
    expect(write.status[1].review).toMatchObject({
      rating: 3,
      reviewedAt: NOW.toISOString(),
    });
  });

  test("sin rol en el repaso ni en el perfil → 400 role_required", () => {
    expect(() =>
      buildWrite(
        parseInput({
          context: "catalog",
          status: [{ stepId: STEP, status: "known" }],
        }),
        state({ profileRole: null }),
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: "role_required" }));
  });

  test("mismo paso y rol dos veces en reviews → 400 duplicate_step", () => {
    const r = { stepId: STEP2, rating: 3, reviewedAt: NOW.toISOString() };
    expect(() =>
      buildWrite(
        parseInput({
          context: "catalog",
          reviews: [r, { ...r, role: "follower" }],
        }),
        state(),
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: "duplicate_step" }));
  });
});

describe("review-steps: handler", () => {
  const writes: ReviewWrite[] = [];
  const port = (active: boolean): ReviewStepsPort => ({
    loadState: async () => ({
      activeSubscription: active,
      profileRole: "leader",
      steps: [{ id: STEP, hasRoles: true, status: "unknown" }],
      cards: [],
    }),
    apply: async (_user, write) => {
      writes.push(write);
      return [
        {
          stepId: STEP,
          role: "leader",
          dueAt: NOW.toISOString(),
          state: "new",
        },
      ];
    },
  });
  const body = {
    context: "catalog",
    status: [{ stepId: STEP, status: "learning" }],
  };

  test("sin sesión → 401; sin suscripción → 403 antes de escribir", async () => {
    const handler = reviewHandler({ auth, data: port(false), now: () => NOW });
    expect((await handler(post(body, "caducado"))).status).toBe(401);
    const res = await read(await handler(post(body)));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("no_active_subscription");
    expect(writes).toHaveLength(0);
  });

  test("respuesta { cards: [{ stepId, role, dueAt, state }] }", async () => {
    const handler = reviewHandler({ auth, data: port(true), now: () => NOW });
    const res = await read(await handler(post(body)));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      cards: [
        {
          stepId: STEP,
          role: "leader",
          dueAt: NOW.toISOString(),
          state: "new",
        },
      ],
    });
    expect(writes).toHaveLength(1);
  });

  test("entrada inválida → 400 sin leer datos", async () => {
    const handler = reviewHandler({ auth, data: port(true), now: () => NOW });
    const res = await read(await handler(post({ context: "otro" })));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_input");
  });
});
