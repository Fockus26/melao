// Pasos · catálogo: búsqueda, filtros, grupos, URL, próximo repaso, el favorito (secuencia
// update → insert sobre un puerto falso) y el render de la vista (sin reglas: qué pasos, su
// estado y su repaso salen de `step_catalog`).
import { describe, expect, test } from "bun:test";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StepsView, type StepsViewProps } from "@/components/steps/steps-view";
import type { StyleOption } from "@/lib/course/path";
import {
  type CatalogStep,
  dueInDays,
  dueLabel,
  EMPTY_STEP_FILTERS,
  filterSteps,
  groupByCategory,
  hasActiveStepFilters,
  matchesStepQuery,
  parseStepFilters,
  presentCategories,
  STEP_LINKS,
  stepCountLabel,
  stepsSearch,
} from "@/lib/steps/catalog";
import {
  type DbError,
  saveStepFavorite,
  type UserStepsPort,
} from "@/lib/steps/favorite";

const step = (over: Partial<CatalogStep> & { id: string }): CatalogStep => ({
  slug: over.id,
  name: "Paso",
  category: "figura",
  difficulty: 2,
  status: "unknown",
  favorite: false,
  dueAt: null,
  ...over,
});

// En el orden de `step_catalog`: categoría (enum) y, dentro, el del admin.
const STEPS: CatalogStep[] = [
  step({ id: "guapea", name: "Guapea", category: "base", difficulty: 1 }),
  step({
    id: "vuelta-derecha",
    name: "Vuelta a la derecha",
    category: "vuelta",
    status: "learning",
  }),
  step({
    id: "enchufla",
    name: "Enchufla",
    category: "salida",
    status: "known",
    favorite: true,
  }),
  step({ id: "exhibela", name: "Exhíbela", category: "figura" }),
  step({
    id: "vacilala",
    name: "Vacílala",
    category: "figura",
    status: "learning",
  }),
];

const NOW = new Date("2026-10-02T12:00:00Z");

describe("búsqueda y filtros", () => {
  test("sin acentos ni mayúsculas, todas las palabras en cualquier orden", () => {
    expect(matchesStepQuery({ name: "Exhíbela" }, "exhibela")).toBe(true);
    expect(
      matchesStepQuery({ name: "Vuelta a la derecha" }, "DERECHA vuelta"),
    ).toBe(true);
    expect(matchesStepQuery({ name: "Vuelta a la derecha" }, "izquierda")).toBe(
      false,
    );
    expect(matchesStepQuery({ name: "Guapea" }, "   ")).toBe(true);
  });

  test("categorías y estados: cualquiera dentro del grupo, todos entre grupos", () => {
    const ids = (f: Parameters<typeof filterSteps>[1]) =>
      filterSteps(STEPS, f).map((s) => s.id);
    expect(ids(EMPTY_STEP_FILTERS)).toEqual(STEPS.map((s) => s.id));
    expect(
      ids({ ...EMPTY_STEP_FILTERS, categories: ["base", "salida"] }),
    ).toEqual(["guapea", "enchufla"]);
    expect(ids({ ...EMPTY_STEP_FILTERS, statuses: ["learning"] })).toEqual([
      "vuelta-derecha",
      "vacilala",
    ]);
    expect(
      ids({ q: "a", categories: ["figura"], statuses: ["learning"] }),
    ).toEqual(["vacilala"]);
  });

  test("hay filtros activos", () => {
    expect(hasActiveStepFilters(EMPTY_STEP_FILTERS)).toBe(false);
    expect(hasActiveStepFilters({ ...EMPTY_STEP_FILTERS, q: " " })).toBe(false);
    expect(
      hasActiveStepFilters({ ...EMPTY_STEP_FILTERS, statuses: ["known"] }),
    ).toBe(true);
  });
});

describe("grupos", () => {
  test("por categoría en el orden del enum, sin vacíos, conservando el orden", () => {
    const groups = groupByCategory([...STEPS].reverse());
    expect(groups.map((g) => g.category)).toEqual([
      "base",
      "vuelta",
      "salida",
      "figura",
    ]);
    expect(groups[3].steps.map((s) => s.id)).toEqual(["vacilala", "exhibela"]);
    expect(presentCategories(STEPS)).toEqual([
      "base",
      "vuelta",
      "salida",
      "figura",
    ]);
  });
});

describe("URL", () => {
  test("lee y escribe filtros con valores en inglés (D077)", () => {
    const filters = parseStepFilters({
      q: "vuelta",
      category: "exit,turn,nope",
      status: "known,learning,x",
    });
    expect(filters).toEqual({
      q: "vuelta",
      categories: ["vuelta", "salida"],
      statuses: ["learning", "known"],
    });
    expect(stepsSearch({ style: "s1" }, filters)).toBe(
      "?style=s1&q=vuelta&category=turn%2Cexit&status=learning%2Cknown",
    );
    expect(stepsSearch({}, EMPTY_STEP_FILTERS)).toBe("");
  });

  test("lo que no se entiende se ignora", () => {
    expect(parseStepFilters({ category: ["vuelta"], status: "" })).toEqual(
      EMPTY_STEP_FILTERS,
    );
    expect(parseStepFilters({ q: "x".repeat(200) }).q).toHaveLength(120);
  });

  test("enlaces", () => {
    expect(STEP_LINKS.catalog).toBe("/app/steps");
    expect(STEP_LINKS.step("enchufla")).toBe("/app/steps/enchufla");
  });
});

describe("próximo repaso", () => {
  test("días de calendario; vencido = hoy; sin tarjeta, nada", () => {
    expect(dueInDays(null, NOW)).toBeNull();
    expect(dueInDays("no es fecha", NOW)).toBeNull();
    expect(dueInDays("2026-09-28T08:00:00Z", NOW, "UTC")).toBe(0);
    expect(dueInDays("2026-10-02T23:59:00Z", NOW, "UTC")).toBe(0);
    expect(dueInDays("2026-10-03T00:01:00Z", NOW, "UTC")).toBe(1);
    expect(dueInDays("2026-10-11T09:00:00Z", NOW, "UTC")).toBe(9);
  });

  test("por la zona del dispositivo", () => {
    // 01:00 UTC del 3 es todavía el 2 en Bogotá (UTC−5).
    expect(dueInDays("2026-10-03T01:00:00Z", NOW, "America/Bogota")).toBe(0);
    expect(dueInDays("2026-10-03T01:00:00Z", NOW, "UTC")).toBe(1);
  });

  test("texto", () => {
    expect(dueLabel(null, NOW)).toBeNull();
    expect(dueLabel("2026-09-30T08:00:00Z", NOW, "UTC")).toBe("Toca hoy");
    expect(dueLabel("2026-10-03T08:00:00Z", NOW, "UTC")).toBe("Repaso mañana");
    expect(dueLabel("2026-10-11T08:00:00Z", NOW, "UTC")).toBe(
      "Repaso en 9 días",
    );
  });

  test("contador", () => {
    expect(stepCountLabel(1)).toBe("1 paso");
    expect(stepCountLabel(80)).toBe("80 pasos");
  });
});

/** Puerto falso de `user_steps`: una fila por paso y las respuestas que se le pidan. */
function fakePort(
  rows: Map<string, boolean>,
  opts: {
    updateError?: DbError;
    insertError?: DbError;
    /** Simula otra pestaña: la fila aparece justo antes del insert. */
    raceOnInsert?: boolean;
  } = {},
) {
  const calls: string[] = [];
  const port: UserStepsPort = {
    async update(_user, stepId, favorite) {
      calls.push(`update ${stepId} ${favorite}`);
      if (opts.updateError) return { matched: false, error: opts.updateError };
      if (!rows.has(stepId)) return { matched: false, error: null };
      rows.set(stepId, favorite);
      return { matched: true, error: null };
    },
    async insert(_user, stepId, favorite) {
      calls.push(`insert ${stepId} ${favorite}`);
      if (opts.raceOnInsert) {
        rows.set(stepId, false);
        return { error: { code: "23505", message: "duplicate key" } };
      }
      if (opts.insertError) return { error: opts.insertError };
      rows.set(stepId, favorite);
      return { error: null };
    },
  };
  return { port, calls };
}

describe("saveStepFavorite (D129)", () => {
  test("sin fila: update que no toca nada y luego insert", async () => {
    const rows = new Map<string, boolean>();
    const { port, calls } = fakePort(rows);
    expect(await saveStepFavorite(port, "u", "a", true)).toBe("ok");
    expect(calls).toEqual(["update a true", "insert a true"]);
    expect(rows.get("a")).toBe(true);
  });

  test("con fila: solo update", async () => {
    const rows = new Map([["a", true]]);
    const { port, calls } = fakePort(rows);
    expect(await saveStepFavorite(port, "u", "a", false)).toBe("ok");
    expect(calls).toEqual(["update a false"]);
    expect(rows.get("a")).toBe(false);
  });

  test("desmarcar sin fila no escribe", async () => {
    const { port, calls } = fakePort(new Map());
    expect(await saveStepFavorite(port, "u", "a", false)).toBe("ok");
    expect(calls).toEqual(["update a false"]);
  });

  test("otra pestaña creó la fila: reintenta el update", async () => {
    const rows = new Map<string, boolean>();
    const { port, calls } = fakePort(rows, { raceOnInsert: true });
    expect(await saveStepFavorite(port, "u", "a", true)).toBe("ok");
    expect(calls).toEqual(["update a true", "insert a true", "update a true"]);
    expect(rows.get("a")).toBe(true);
  });

  test("errores: sesión vencida → unauthorized; lo demás → error", async () => {
    const jwt = fakePort(new Map(), {
      updateError: { code: "PGRST301", message: "JWT expired" },
    });
    expect(await saveStepFavorite(jwt.port, "u", "a", true)).toBe(
      "unauthorized",
    );
    const rls = fakePort(new Map(), {
      insertError: { code: "42501", message: "row-level security" },
    });
    expect(await saveStepFavorite(rls.port, "u", "a", true)).toBe("error");
  });
});

const STYLE = (id: string, name: string): StyleOption => ({
  id,
  name,
  hasRoles: true,
  chosen: true,
  hasCourse: true,
  lessonCount: 0,
  completedCount: 0,
});
const STYLES = [STYLE("s1", "Salsa casino"), STYLE("s2", "Merengue")];

// `useRouter` exige el router de la app montado: un router de mentira basta para pintar.
const router = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
} as unknown as AppRouterInstance;

const render = (props: Partial<StepsViewProps> = {}) =>
  renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: router },
      createElement(StepsView, {
        styles: STYLES,
        currentStyle: STYLES[0],
        steps: STEPS,
        variant: "sample",
        now: NOW.toISOString(),
        ...props,
      }),
    ),
  );

describe("StepsView", () => {
  test("fila: enlace al detalle y corazón aparte con nombre y aria-pressed", () => {
    const html = render();
    expect(html).toContain('href="/app/steps/enchufla"');
    expect(html).toContain(
      'aria-pressed="true" aria-label="Agregar Enchufla a favoritos"',
    );
    expect(html).toContain(
      'aria-pressed="false" aria-label="Agregar Guapea a favoritos"',
    );
    // El botón no va dentro del enlace.
    expect(html).not.toMatch(/<a [^>]*>(?:(?!<\/a>)[\s\S])*<button/);
  });

  test("metadatos: estado con texto, dificultad con su nombre y próximo repaso", () => {
    const html = render({
      steps: [
        step({
          id: "dame",
          name: "Dame",
          status: "learning",
          difficulty: 4,
          dueAt: "2026-10-11T12:00:00Z",
        }),
      ],
    });
    expect(html).toContain('data-status="learning"');
    expect(html).toContain("Aprendiendo");
    expect(html).toContain("Difícil");
    expect(html).toContain("Repaso en 9 días");
  });

  test("grupos con cabecera y contador; contador vivo con el estilo", () => {
    const html = render();
    expect(html).toMatch(/aria-live="polite"[^>]*>5 pasos de Salsa casino</);
    expect(html).toContain('aria-labelledby="steps-figura"');
    expect(html).toContain("Figuras");
    expect(html).toContain("Pasos base");
    expect(html).toContain("<search");
    expect(html).toContain("Buscar pasos");
  });

  test("chips: Categoría (las que hay) y Estado", () => {
    const html = render();
    expect(html).toContain("Categoría");
    expect(html).toContain("Vueltas");
    expect(html).not.toContain("Variaciones");
    expect(html).toContain("No lo sé");
    expect(html).toContain("Me lo sé");
    // Con una sola categoría no hay chips de Categoría.
    expect(render({ steps: STEPS.slice(0, 1) })).not.toContain(
      ">Categoría</legend>",
    );
  });

  test("con filtros: n de total y sin resultados con Limpiar filtros", () => {
    expect(
      render({
        initialFilters: { ...EMPTY_STEP_FILTERS, statuses: ["learning"] },
      }),
    ).toMatch(/>2 de 5 pasos de Salsa casino</);
    const none = render({
      initialFilters: { ...EMPTY_STEP_FILTERS, q: "bachata" },
    });
    expect(none).toContain("No hay pasos con estos filtros");
    expect(none).toContain("Limpiar filtros");
  });

  test("segmentado de estilo solo con más de uno", () => {
    expect(render()).toContain('aria-current="page"');
    expect(render({ styles: STYLES.slice(0, 1) })).not.toContain(
      'aria-current="page"',
    );
  });

  test("estilo sin pasos, sin estilos y error", () => {
    expect(render({ steps: [] })).toContain("Aún no hay pasos de Salsa casino");
    expect(render({ currentStyle: null, styles: [] })).toContain(
      "Aún no hay estilos publicados",
    );
    const error = render({ steps: [], loadError: true });
    expect(error).toContain('role="alert"');
    expect(error).toContain("Reintentar");
  });
});
