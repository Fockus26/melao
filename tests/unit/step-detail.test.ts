// Pasos · detalle: lectura de la fila de `step_detail`, video por rol, relacionados, enlaces,
// el cambio de estado contra `review-steps` (cuerpo, resultados, tarjeta de la respuesta), el
// estado optimista (D141) y el render de la vista. Sin reglas: qué paso, si es libre, sus
// relacionados y su historial salen de `step_detail`.
import { describe, expect, test } from "bun:test";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  StepDetailView,
  type StepDetailViewProps,
} from "@/components/steps/detail/step-detail-view";
import {
  catalogHref,
  dueAtFromCards,
  groupRelated,
  initialStatusState,
  initialVideoRole,
  isStepSlug,
  parseStepDetail,
  phrasesLabel,
  type StepDetail,
  type StepDetailRow,
  shortDate,
  statusReducer,
  statusRequest,
  statusSaveResult,
  stepHref,
  videoFor,
} from "@/lib/steps/detail";

const NOW = "2026-10-02T12:00:00Z";

const ROW: StepDetailRow = {
  step_id: "s-enchufla",
  style_id: "salsa",
  slug: "enchufla",
  name: "Enchufla",
  description: "Desde cerrada, cambian de lugar.",
  category: "salida",
  difficulty: 2,
  phrases: 1,
  beat_notes: [
    { beat: 5, note: "Cambio de lugar" },
    { beat: 1, note: "Rompe atrás" },
    { beat: "x", note: "basura" },
  ],
  free: false,
  start_position: "Cerrada",
  end_position: "Guapea",
  videos: [
    { role: "leader", duration_ms: 42000, aspect: "16:9" },
    { role: "follower", duration_ms: null },
    { role: "otro", duration_ms: 1 },
  ],
  role: "follower",
  status: "learning",
  favorite: true,
  due_at: "2026-10-05T12:00:00Z",
  related: [
    {
      step_id: "s-dqs",
      slug: "dile-que-si",
      name: "Dile que sí",
      relation: "prerequisite",
    },
    {
      step_id: "s-doble",
      slug: "enchufla-doble",
      name: "Enchufla doble",
      relation: "variation",
    },
    { step_id: "s-x", slug: "x", name: "X", relation: "rara" },
  ],
  history: [
    {
      reviewed_at: "2026-10-01T19:00:00Z",
      rating: 3,
      context: "practice",
      role: "follower",
    },
    { reviewed_at: "2026-09-20T19:00:00Z", rating: 9, context: "x" },
  ],
};

const STEP = parseStepDetail(ROW);

describe("parseStepDetail", () => {
  test("nombres de TS; tiempos ordenados; descarta lo que no tiene forma", () => {
    expect(STEP).toMatchObject({
      id: "s-enchufla",
      styleId: "salsa",
      startPosition: "Cerrada",
      endPosition: "Guapea",
      role: "follower",
      dueAt: "2026-10-05T12:00:00Z",
    });
    expect(STEP.beatNotes.map((n) => n.beat)).toEqual([1, 5]);
    expect(STEP.videos).toEqual([
      { role: "leader", durationMs: 42000 },
      { role: "follower", durationMs: null },
    ]);
    expect(STEP.related.map((r) => r.relation)).toEqual([
      "prerequisite",
      "variation",
    ]);
    expect(STEP.history).toEqual([
      {
        reviewedAt: "2026-10-01T19:00:00Z",
        rating: 3,
        context: "practice",
        role: "follower",
      },
    ]);
  });

  test("nulos: sin descripción (o en blanco), sin rol, sin tarjeta, jsonb no lista", () => {
    const step = parseStepDetail({
      ...ROW,
      description: "  ",
      role: null,
      due_at: null,
      videos: null,
      related: {},
      history: "x",
    });
    expect(step).toMatchObject({
      description: null,
      role: null,
      dueAt: null,
      videos: [],
      related: [],
      history: [],
    });
  });

  test("slug válido", () => {
    expect(isStepSlug("enchufla-doble")).toBe(true);
    expect(isStepSlug("Enchufla")).toBe(false);
    expect(isStepSlug("a/b")).toBe(false);
    expect(isStepSlug("")).toBe(false);
  });
});

describe("video y relacionados", () => {
  test("rol al abrir: el del perfil o líder; paso libre, ninguno", () => {
    expect(initialVideoRole(STEP)).toBe("follower");
    expect(initialVideoRole({ free: false, role: null })).toBe("leader");
    expect(initialVideoRole({ free: true, role: "follower" })).toBeNull();
  });

  test("video del rol o el único (`both`)", () => {
    expect(videoFor(STEP, "leader")?.durationMs).toBe(42000);
    expect(videoFor(STEP, "follower")?.durationMs).toBeNull();
    const libre = { videos: [{ role: "both" as const, durationMs: 9000 }] };
    expect(videoFor(libre, null)?.durationMs).toBe(9000);
    expect(videoFor(libre, "leader")?.durationMs).toBe(9000);
    expect(videoFor({ videos: [] }, "leader")).toBeNull();
  });

  test("relacionados por relación, sin grupos vacíos", () => {
    expect(
      groupRelated(STEP.related).map((g) => [
        g.relation,
        g.steps.map((s) => s.slug),
      ]),
    ).toEqual([
      ["prerequisite", ["dile-que-si"]],
      ["variation", ["enchufla-doble"]],
    ]);
  });

  test("enlaces: `?style=` solo si el paso no es del estilo actual (D138)", () => {
    expect(stepHref("dame", "salsa", "salsa")).toBe("/app/steps/dame");
    expect(stepHref("dame", "rueda", "salsa")).toBe(
      "/app/steps/dame?style=rueda",
    );
    expect(catalogHref("salsa", "salsa")).toBe("/app/steps");
    expect(catalogHref("rueda", null)).toBe("/app/steps?style=rueda");
  });
});

describe("cambiar el estado (review-steps)", () => {
  test("cuerpo: context catalog, sin rol (lo pone el perfil)", () => {
    expect(statusRequest("s1", "known")).toEqual({
      context: "catalog",
      status: [{ stepId: "s1", status: "known" }],
    });
  });

  test("resultados", () => {
    const err = (status: number, code: string) => ({
      status,
      body: { error: { code, message: "" } },
    });
    expect(statusSaveResult({ status: 200, body: { cards: [] } })).toBe("ok");
    expect(statusSaveResult({ status: 0, body: null })).toBe("offline");
    expect(statusSaveResult(err(401, "unauthorized"))).toBe("unauthorized");
    expect(statusSaveResult(err(403, "no_active_subscription"))).toBe(
      "subscription",
    );
    expect(statusSaveResult(err(400, "role_required"))).toBe("role");
    expect(statusSaveResult({ status: 500, body: null })).toBe("error");
  });

  test("tarjeta de la respuesta: la del rol, la única sin rol, ninguna en unknown", () => {
    const body = {
      cards: [
        { stepId: "s1", role: "leader", dueAt: "A", state: "review" },
        { stepId: "s1", role: "follower", dueAt: "B", state: "new" },
        { stepId: "s2", role: "leader", dueAt: "C", state: "new" },
      ],
    };
    expect(dueAtFromCards(body, "s1", "follower")).toBe("B");
    expect(dueAtFromCards(body, "s2", null)).toBe("C");
    expect(dueAtFromCards({ cards: [] }, "s1", "leader")).toBeNull();
    expect(dueAtFromCards(null, "s1", "leader")).toBeNull();
  });
});

describe("estado optimista (D141)", () => {
  const start = initialStatusState("unknown", null);

  test("al tocar se ve el nuevo y queda ocupado; al guardar, confirmado con su repaso", () => {
    const asked = statusReducer(start, { type: "request", status: "known" });
    expect(asked).toMatchObject({
      shown: "known",
      confirmed: "unknown",
      pending: true,
    });
    const saved = statusReducer(asked, {
      type: "saved",
      status: "known",
      dueAt: "D",
    });
    expect(saved).toEqual({
      shown: "known",
      confirmed: "known",
      dueAt: "D",
      pending: false,
      problem: null,
    });
  });

  test("si falla, vuelve al último confirmado y queda el motivo", () => {
    const asked = statusReducer(start, { type: "request", status: "learning" });
    const failed = statusReducer(asked, {
      type: "failed",
      problem: "subscription",
    });
    expect(failed).toMatchObject({
      shown: "unknown",
      pending: false,
      problem: "subscription",
    });
    // Un nuevo intento borra el motivo; descartar también.
    expect(
      statusReducer(failed, { type: "request", status: "learning" }).problem,
    ).toBeNull();
    expect(statusReducer(failed, { type: "dismiss" }).problem).toBeNull();
  });

  test("ocupado o el mismo estado: tocar no hace nada", () => {
    const asked = statusReducer(start, { type: "request", status: "known" });
    expect(statusReducer(asked, { type: "request", status: "learning" })).toBe(
      asked,
    );
    expect(statusReducer(start, { type: "request", status: "unknown" })).toBe(
      start,
    );
  });
});

describe("formato", () => {
  test("frases y fechas", () => {
    expect(phrasesLabel(1)).toBe("1 frase");
    expect(phrasesLabel(2)).toBe("2 frases");
    const now = new Date(NOW);
    expect(shortDate("2026-09-28T19:00:00Z", now, "UTC")).toBe("28 sept");
    expect(shortDate("2025-09-28T19:00:00Z", now, "UTC")).toMatch(/2025/);
    // Por la zona: las 2:00 UTC del 29 son el 28 en Bogotá.
    expect(shortDate("2026-09-29T02:00:00Z", now, "America/Bogota")).toMatch(
      /^28/,
    );
    expect(shortDate("no", now, "UTC")).toBe("");
  });
});

// `useRouter` exige el router de la app montado: un router de mentira basta para pintar.
const router = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
} as unknown as AppRouterInstance;

const render = (
  step: StepDetail = STEP,
  props: Partial<StepDetailViewProps> = {},
) =>
  renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: router },
      createElement(StepDetailView, {
        step,
        currentStyleId: "salsa",
        canChangeStatus: true,
        variant: "sample",
        now: NOW,
        ...props,
      }),
    ),
  );

describe("StepDetailView", () => {
  test("barra, cabecera, segmentado de rol y video en preparación", () => {
    const html = render();
    expect(html).toContain('href="/app/steps"');
    expect(html).toContain(
      'aria-pressed="true" aria-label="Agregar Enchufla a favoritos"',
    );
    expect(html).toContain("Salida");
    expect(html).toMatch(/<h1[^>]*>Enchufla<\/h1>/);
    expect(html).toContain("1 frase");
    expect(html).toContain('aria-label="Rol del video"');
    expect(html).toContain("Video en preparación");
    expect(html).not.toContain("Paso libre: lo bailas sin pareja");
  });

  test("Tu estado: tres chips con aria-pressed y texto", () => {
    const html = render();
    expect(html).toContain("<fieldset");
    expect(html).toMatch(
      /aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*Aprendiendo/,
    );
    expect(html).toMatch(
      /aria-pressed="false"[^>]*>(?:(?!<\/button>)[\s\S])*No lo sé/,
    );
    expect(html).toMatch(
      /aria-pressed="false"[^>]*>(?:(?!<\/button>)[\s\S])*Me lo sé/,
    );
    expect(html).not.toContain("Activa tu plan");
  });

  test("sin suscripción: chips deshabilitados y Activa tu plan con enlace a planes", () => {
    const html = render(STEP, { canChangeStatus: false });
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(3);
    expect(html).toContain("Activa tu plan para marcar tu estado");
    expect(html).toContain('href="/plans"');
  });

  test("por tiempos, posición, relacionados que enlazan e historial", () => {
    const html = render();
    expect(html).toContain("Rompe atrás");
    expect(html).toContain("Tiempo 1");
    expect(html).toContain("Cerrada");
    expect(html).toContain("Guapea");
    expect(html).toContain('href="/app/steps/dile-que-si"');
    expect(html).toContain("Antes aprende");
    expect(html).toContain("Variaciones");
    expect(html).toContain("Próximo repaso");
    expect(html).toContain("En 3 días");
    expect(html).toContain("Bien");
    expect(html).toContain("En una práctica, como seguidor");
    expect(html).toContain('dateTime="2026-10-01T19:00:00Z"');
  });

  test("paso libre: sin segmentado, con la nota; vacíos con su texto", () => {
    const html = render({
      ...STEP,
      category: "libre",
      free: true,
      videos: [{ role: "both", durationMs: 28000 }],
      beatNotes: [],
      related: [],
      history: [],
      dueAt: null,
      description: null,
    });
    expect(html).not.toContain('aria-label="Rol del video"');
    expect(html).toContain("Paso libre: lo bailas sin pareja");
    expect(html).toContain("0:28");
    expect(html).toContain("llega pronto");
    expect(html).toContain("no tiene pasos relacionados");
    expect(html).toContain("Aún no has repasado este paso.");
    expect(html).toContain("Sin repaso programado");
    expect(html).not.toContain(">Descripción<");
  });
});
