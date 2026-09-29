/**
 * Prueba de humo de las Edge Functions contra el proyecto real, con una cuenta de prueba.
 *
 * Uso (lo corre César; el agente nunca maneja la contraseña):
 *   bun run smoke:ef
 *
 * Lee de `.env.local` (bun lo carga solo): NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, EMAIL_TEST y PASSWORD_TEST. No imprime secretos.
 *
 * Qué hace, en orden (idempotente: se puede correr varias veces):
 *  1. Entra con la cuenta de prueba y lee su perfil (rol de app y de baile).
 *  2. activate-subscription { planSlug: "basico" } → suscripción placeholder activa.
 *  3. review-steps (catálogo): marca Guapea como "me lo sé" → tarjeta FSRS.
 *  4. plan-session (lección 1 de salsa, semilla 42). Con una cuenta de alumno, las canciones del
 *     seed no están publicadas y la respuesta esperada es 404 `song_not_found` (D063); con una
 *     cuenta admin, un plan con su línea de tiempo.
 *  5. Si hubo plan: review-steps (práctica de lección) califica cada paso con "Bien" (3).
 *  6. Relee con RLS lo que quedó: suscripción, tarjetas y sesiones.
 * Sale con código 1 si algo no salió como se espera.
 */

import { createClient, FunctionsHttpError } from "@supabase/supabase-js";

const SALSA = "a0000000-0000-4000-8000-000000000001";
const SONG_1 = "c0000000-0000-4000-8000-000000000001";
const LESSON_1 = "d2000000-0000-4000-8000-000000000111";
const GUAPEA = "b1000000-0000-4000-8000-000000000001";

const env = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta ${name} en .env.local.`);
    process.exit(1);
  }
  return value;
};

const url = env("NEXT_PUBLIC_SUPABASE_URL");
if (!url.startsWith("https://")) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL debe ser la URL completa (https://<ref>.supabase.co).",
  );
  process.exit(1);
}
const supabase = createClient(
  url,
  env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

let failed = false;
const ok = (step: string, detail: string) =>
  console.log(`✔ ${step} — ${detail}`);
const fail = (step: string, detail: string) => {
  failed = true;
  console.log(`✘ ${step} — ${detail}`);
};

/** Llama a una función y devuelve { status, body } sin lanzar en 4xx/5xx. */
async function call(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return { status: 200, body: data };
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    return { status: res.status, body: await res.json().catch(() => null) };
  }
  return {
    status: 0,
    body: { error: { code: "network", message: error.message } },
  };
}

const code = (body: unknown) =>
  (body as { error?: { code?: string } } | null)?.error?.code ?? "sin código";

// 1. Entrar
const { data: auth, error: authError } = await supabase.auth.signInWithPassword(
  {
    email: env("EMAIL_TEST"),
    password: env("PASSWORD_TEST"),
  },
);
if (authError || !auth.user) {
  console.error(`✘ entrar — ${authError?.message ?? "sin usuario"}`);
  process.exit(1);
}
const { data: profile } = await supabase
  .from("profiles")
  .select("app_role, dance_role")
  .eq("id", auth.user.id)
  .single();
const isAdmin = profile?.app_role === "admin";
ok(
  "entrar",
  `perfil ${profile?.app_role ?? "?"}, rol de baile ${profile?.dance_role ?? "sin elegir"}`,
);

// 2. Suscripción
const sub = await call("activate-subscription", { planSlug: "basico" });
if (sub.status === 200) {
  const s = sub.body as {
    subscription?: { plan: string; status: string; currentPeriodEnd: string };
  };
  const d =
    s.subscription ??
    (sub.body as { plan: string; status: string; currentPeriodEnd: string });
  ok(
    "activate-subscription",
    `${d.plan} · ${d.status} · vence ${d.currentPeriodEnd}`,
  );
} else if (sub.status === 409) {
  ok("activate-subscription", "ya tenía otra suscripción activa (409, D049)");
} else {
  fail("activate-subscription", `HTTP ${sub.status} ${code(sub.body)}`);
}

// 3. Catálogo: "me lo sé"
const known = await call("review-steps", {
  context: "catalog",
  status: [{ stepId: GUAPEA, status: "known", role: "leader" }],
});
if (known.status === 200) {
  const cards = (known.body as { cards: { state: string; dueAt: string }[] })
    .cards;
  ok(
    "review-steps (catálogo)",
    `Guapea: ${cards.map((c) => `${c.state}, vence ${c.dueAt}`).join(" · ")}`,
  );
} else {
  fail("review-steps (catálogo)", `HTTP ${known.status} ${code(known.body)}`);
}

// 4. Plan de la lección 1
const plan = await call("plan-session", {
  styleId: SALSA,
  songId: SONG_1,
  mode: "lesson",
  lessonId: LESSON_1,
  seed: 42,
});
let sessionId: string | null = null;
let planSteps: string[] = [];
if (plan.status === 200) {
  const p = plan.body as {
    sessionId: string;
    phrasesAvailable: number;
    plan: { stepId: string }[];
    timeline: unknown[];
  };
  sessionId = p.sessionId;
  planSteps = [...new Set(p.plan.map((i) => i.stepId))];
  ok(
    "plan-session",
    `${p.plan.length} pasos en ${p.phrasesAvailable} frases, ${p.timeline.length} eventos`,
  );
} else if (
  plan.status === 404 &&
  code(plan.body) === "song_not_found" &&
  !isAdmin
) {
  ok(
    "plan-session",
    "404 song_not_found: esperado con cuenta de alumno (canciones del seed sin publicar, D063)",
  );
} else {
  fail("plan-session", `HTTP ${plan.status} ${code(plan.body)}`);
}

// 5. Calificar la práctica
if (sessionId) {
  const reviewedAt = new Date().toISOString();
  const graded = await call("review-steps", {
    context: "lesson",
    lessonId: LESSON_1,
    sessionId,
    reviews: planSteps.map((stepId) => ({
      stepId,
      role: "leader",
      rating: 3,
      reviewedAt,
    })),
  });
  if (graded.status === 200)
    ok("review-steps (lección)", `${planSteps.length} pasos calificados`);
  else
    fail(
      "review-steps (lección)",
      `HTTP ${graded.status} ${code(graded.body)}`,
    );
}

// 6. Releer con RLS
const [subs, cards, sessions] = await Promise.all([
  supabase
    .from("subscriptions")
    .select("status", { count: "exact", head: true })
    .eq("status", "active"),
  supabase.from("srs_cards").select("step_id", { count: "exact", head: true }),
  supabase
    .from("practice_sessions")
    .select("id", { count: "exact", head: true }),
]);
ok(
  "lectura con RLS",
  `suscripciones activas ${subs.count ?? "?"} · tarjetas ${cards.count ?? "?"} · sesiones ${sessions.count ?? "?"}`,
);

await supabase.auth.signOut();
process.exit(failed ? 1 : 0);
