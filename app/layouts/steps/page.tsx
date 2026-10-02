import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { StepsSkeleton } from "@/components/steps/steps-skeleton";
import { StepsView, type StepsViewProps } from "@/components/steps/steps-view";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import type { StyleOption } from "@/lib/course/path";
import { firstParam } from "@/lib/search-params";
import {
  CATEGORY_ORDER,
  type CatalogStep,
  EMPTY_STEP_FILTERS,
} from "@/lib/steps/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pasos · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Pasos · catálogo sin sesión ni base (la real exige cuenta): los estados por
 * `?state=`, con los pasos de salsa casino del seed. Búsqueda, filtros y corazón funcionan, pero
 * el corazón no escribe nada. "Ahora" fijo: 2 de octubre de 2026 a mediodía UTC. Copy de
 * ejemplo (CONTENT_CHECKLIST fila 71).
 */

const STATES = {
  list: "Lista",
  filtered: "Con filtros",
  one: "1 paso",
  many: "80 pasos",
  "no-results": "Sin resultados",
  empty: "Estilo sin pasos",
  "one-style": "Un solo estilo",
  "no-styles": "Sin estilos",
  loading: "Cargando",
  error: "Error",
} as const;
type SampleState = keyof typeof STATES;

const NOW = "2026-10-02T12:00:00Z";
const inDays = (days: number) =>
  new Date(Date.parse(NOW) + days * 86_400_000).toISOString();

type Seed = [
  slug: string,
  name: string,
  category: CatalogStep["category"],
  difficulty: number,
];

// Los pasos de salsa casino del seed, en su orden.
const SEED: Seed[] = [
  ["guapea", "Guapea", "base", 1],
  ["basico-cerrada", "Básico en cerrada", "base", 1],
  ["dile-que-si", "Dile que sí", "entrada", 1],
  ["dile-que-no", "Dile que no", "salida", 1],
  ["vuelta-derecha", "Vuelta a la derecha", "vuelta", 1],
  ["vuelta-izquierda", "Vuelta a la izquierda", "vuelta", 2],
  ["enchufla", "Enchufla", "salida", 2],
  ["enchufla-doble", "Enchufla doble", "variacion", 3],
  ["exhibela", "Exhíbela", "figura", 2],
  ["dame", "Dame", "figura", 2],
  ["el-uno", "El uno", "figura", 2],
  ["vacilala", "Vacílala", "figura", 2],
  ["sombrero", "Sombrero", "figura", 3],
  ["setenta", "Setenta", "figura", 3],
  ["kentucky", "Kentucky", "figura", 4],
  ["prima", "Prima", "figura", 3],
  ["montana", "Montaña", "figura", 3],
  ["abanico", "Abanico", "figura", 2],
  ["paseala", "Paséala", "figura", 2],
  ["cierre-al-centro", "Cierre al centro", "entrada", 1],
];

/** Estado, favorito y repaso de ejemplo: un poco de todo. */
const PROGRESS: Record<string, Partial<CatalogStep>> = {
  guapea: { status: "known", dueAt: inDays(9), favorite: true },
  "basico-cerrada": { status: "known", dueAt: inDays(21) },
  "dile-que-si": { status: "learning", dueAt: inDays(-1) },
  "dile-que-no": { status: "learning", dueAt: inDays(1) },
  enchufla: { status: "learning", dueAt: inDays(0), favorite: true },
  "vuelta-derecha": { status: "learning", dueAt: inDays(3) },
  setenta: { favorite: true },
};

const step = ([slug, name, category, difficulty]: Seed): CatalogStep => ({
  id: slug,
  slug,
  name,
  category,
  difficulty,
  status: "unknown",
  favorite: false,
  dueAt: null,
  ...PROGRESS[slug],
});

const STEPS = SEED.map(step).sort(
  (a, b) =>
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
);

/** 80 pasos: los 20 del seed y 60 de relleno marcados como ejemplo, con un nombre de 32. */
const MANY: CatalogStep[] = (
  [
    ...SEED,
    ["dile-que-no-vuelta", "Dile que no con vuelta de la dama", "variacion", 3],
    ...Array.from(
      { length: 59 },
      (_, i): Seed => [
        `ejemplo-${i + 1}`,
        `Figura de ejemplo ${i + 1}`,
        CATEGORY_ORDER[(i % 5) + 1],
        (i % 5) + 1,
      ],
    ),
  ] satisfies Seed[]
)
  .map(step)
  .sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );

const STYLE = (id: string, name: string): StyleOption => ({
  id,
  name,
  hasRoles: true,
  chosen: true,
  hasCourse: true,
  lessonCount: 6,
  completedCount: 2,
});
const STYLES = [
  STYLE("salsa-casino", "Salsa casino"),
  STYLE("merengue", "Merengue"),
];

function propsFor(state: SampleState): StepsViewProps {
  const base: StepsViewProps = {
    styles: STYLES,
    currentStyle: STYLES[0],
    steps: STEPS,
    variant: "sample",
    basePath: "/layouts/steps",
    now: NOW,
  };
  switch (state) {
    case "filtered":
      return {
        ...base,
        initialFilters: {
          q: "",
          categories: ["figura"],
          statuses: ["unknown"],
        },
      };
    case "one":
      return { ...base, steps: STEPS.slice(0, 1) };
    case "many":
      return { ...base, steps: MANY };
    case "no-results":
      return {
        ...base,
        initialFilters: { ...EMPTY_STEP_FILTERS, q: "bachata" },
      };
    case "empty":
      return { ...base, currentStyle: STYLES[1], steps: [] };
    case "one-style":
      return { ...base, styles: STYLES.slice(0, 1) };
    case "no-styles":
      return { ...base, styles: [], currentStyle: null, steps: [] };
    case "error":
      return { ...base, steps: [], loadError: true };
    default:
      return base;
  }
}

export default async function StepsSample(props: PageProps<"/layouts/steps">) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "list";

  return (
    <AppShell
      currentPath="/app/steps"
      plan={{ name: "Básico", status: "activo" }}
    >
      <div className="flex flex-col gap-12">
        {state === "loading" ? (
          <StepsSkeleton />
        ) : (
          <StepsView key={state} {...propsFor(state)} />
        )}
        <section
          aria-labelledby="muestra-estados"
          className="flex flex-col gap-4 rounded-md border border-divider bg-surface p-5"
        >
          <h2 id="muestra-estados" className="type-h4">
            Estados de la muestra
          </h2>
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(STATES) as SampleState[]).map((key) => (
              <li key={key}>
                <Link
                  href={`/layouts/steps?state=${key}`}
                  aria-current={key === state ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-12 items-center rounded-pill border px-4 type-small",
                    key === state
                      ? "border-primary bg-primary font-semibold text-on-primary"
                      : "border-border-input text-text hover:bg-hover",
                  )}
                >
                  {STATES[key]}
                </Link>
              </li>
            ))}
          </ul>
          <ThemeSwitch />
          <Link
            href="/layouts"
            className="inline-flex min-h-12 items-center self-start type-small text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text"
          >
            Volver a las muestras
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
