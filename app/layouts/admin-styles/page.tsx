import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/layout/admin-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import {
  type AdminStyleFull,
  type StyleIssue,
  type StyleStep,
  styleWriteErrorMessage,
} from "@/lib/admin/styles";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { StylesAdminSample } from "./sample-view";

export const metadata: Metadata = {
  title: "Admin, estilos · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Admin · Estilos sin sesión ni base (la real exige rol admin), por `?state=`: salsa
 * casino completa, un estilo nuevo, uno con el catálogo inválido, bandas vacías, uno vacío que se
 * puede borrar, error al guardar y error al cargar. Las escrituras responden con un puerto falso
 * (nada se escribe). Copy de ejemplo (CONTENT_CHECKLIST fila 89).
 */

const STATES = {
  full: "Salsa casino completa",
  new: "Estilo nuevo",
  catalog: "Catálogo inválido",
  "no-bands": "Bandas vacías",
  empty: "Estilo vacío",
  "save-error": "Error al guardar",
  "load-error": "Error al cargar",
} as const;
type SampleState = keyof typeof STATES;

const pos = (style: number, n: number) =>
  `a${style}000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const SALSA: AdminStyleFull = {
  id: "a0000000-0000-4000-8000-000000000001",
  slug: "salsa-casino",
  name: "Salsa casino",
  published: true,
  sortOrder: 1,
  hasRoles: true,
  beatsPerPhrase: 8,
  spokenBeats: [1, 2, 3, 5, 6, 7],
  callBeat: 5,
  callSpanBeats: 2,
  leadInPhrases: 1,
  bands: [170, 185, 200, 215],
  startPositionId: pos(1, 1),
  stepCount: 14,
  stepsPublished: 12,
  songCount: 3,
  hasCourse: true,
  positions: [
    { id: pos(1, 3), slug: "abierta", name: "Abierta", stepCount: 4 },
    { id: pos(1, 2), slug: "cerrada", name: "Cerrada", stepCount: 9 },
    { id: pos(1, 1), slug: "guapea", name: "Guapea", stepCount: 8 },
    { id: pos(1, 4), slug: "paseo", name: "Paseo", stepCount: 0 },
  ],
};

const MERENGUE: AdminStyleFull = {
  ...SALSA,
  id: "a0000000-0000-4000-8000-000000000002",
  slug: "merengue",
  name: "Merengue",
  sortOrder: 2,
  spokenBeats: [1, 2, 3, 4, 5, 6, 7, 8],
  bands: null,
  startPositionId: pos(2, 1),
  stepCount: 6,
  stepsPublished: 6,
  songCount: 2,
  positions: [
    { id: pos(2, 2), slug: "abierta", name: "Abierta", stepCount: 2 },
    { id: pos(2, 1), slug: "cerrada", name: "Cerrada", stepCount: 6 },
  ],
};

const BACHATA: AdminStyleFull = {
  ...SALSA,
  id: "a0000000-0000-4000-8000-000000000003",
  slug: "bachata",
  name: "Bachata",
  published: false,
  sortOrder: 3,
  spokenBeats: [1, 2, 3, 5, 6, 7],
  callBeat: 6,
  callSpanBeats: 2,
  bands: [110, 125, 140, 155],
  startPositionId: pos(3, 1),
  stepCount: 3,
  stepsPublished: 1,
  songCount: 0,
  hasCourse: false,
  positions: [
    { id: pos(3, 2), slug: "abierta", name: "Abierta", stepCount: 2 },
    { id: pos(3, 1), slug: "cerrada", name: "Cerrada", stepCount: 3 },
  ],
};

const KIZOMBA: AdminStyleFull = {
  ...SALSA,
  id: "a0000000-0000-4000-8000-000000000004",
  slug: "kizomba",
  name: "Kizomba",
  published: false,
  sortOrder: 4,
  hasRoles: true,
  bands: null,
  startPositionId: null,
  stepCount: 0,
  stepsPublished: 0,
  songCount: 0,
  hasCourse: false,
  positions: [],
};

const STYLES = [SALSA, MERENGUE, BACHATA, KIZOMBA];

const step = (
  styleN: number,
  n: number,
  name: string,
  category: StyleStep["category"],
  start: number,
  end: number,
  over: Partial<StyleStep> = {},
): StyleStep => ({
  id: `b${styleN}000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  name,
  category,
  startPositionId: pos(styleN, start),
  endPositionId: pos(styleN, end),
  phrases: 1,
  canStart: category === "base" || category === "entrada",
  canEnd: true,
  repeatable: category === "base",
  published: true,
  maxNoteBeat: 5,
  ...over,
});

// Guapea = 1, Cerrada = 2, Abierta = 3.
const SALSA_STEPS: StyleStep[] = [
  step(1, 1, "Guapea", "base", 1, 1),
  step(1, 2, "Básico en cerrada", "base", 2, 2),
  step(1, 3, "Dile que sí", "entrada", 1, 2),
  step(1, 4, "Dile que no", "salida", 2, 1),
  step(1, 5, "Enchufla", "vuelta", 2, 2),
  step(1, 6, "Abanico", "salida", 2, 3, { canEnd: false }),
  step(1, 7, "Exhibe", "entrada", 3, 1),
  step(1, 8, "Setenta", "figura", 2, 2, {
    phrases: 2,
    published: false,
    maxNoteBeat: 8,
  }),
];

const MERENGUE_STEPS: StyleStep[] = [
  step(2, 1, "Marcha", "base", 1, 1),
  step(2, 2, "Abre", "salida", 1, 2),
  step(2, 3, "Cierra", "entrada", 2, 1),
];

// Bachata: desde "Abierta" no hay paso base ni cierre; solo un paso publicado.
const BACHATA_STEPS: StyleStep[] = [
  step(3, 1, "Básico", "base", 1, 1),
  step(3, 2, "Apertura", "salida", 1, 2, { published: false, canEnd: false }),
  step(3, 3, "Giro abierto", "vuelta", 2, 2, {
    published: false,
    canEnd: false,
    canStart: false,
  }),
];

const STEPS_OF: Record<string, StyleStep[]> = {
  [SALSA.slug]: SALSA_STEPS,
  [MERENGUE.slug]: MERENGUE_STEPS,
  [BACHATA.slug]: BACHATA_STEPS,
  [KIZOMBA.slug]: [],
};

const DEFAULT_STYLE: Record<SampleState, string | null> = {
  full: SALSA.slug,
  new: null,
  catalog: BACHATA.slug,
  "no-bands": MERENGUE.slug,
  empty: KIZOMBA.slug,
  "save-error": SALSA.slug,
  "load-error": SALSA.slug,
};

export default async function AdminStylesSamplePage(
  props: PageProps<"/layouts/admin-styles">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "full";
  const requested = firstParam(params.style);
  const isNew = requested === "new" || (!requested && state === "new");
  const slug = isNew ? null : (requested ?? DEFAULT_STYLE[state]);
  const current = STYLES.find((s) => s.slug === slug) ?? null;
  const issues: StyleIssue[] =
    current && !current.startPositionId ? ["missing_start_position"] : [];

  return (
    <AdminShell currentPath="/admin/styles">
      <div className="flex flex-col gap-12">
        <StylesAdminSample
          // Cada estado y cada estilo montan la vista de nuevo (la muestra no tiene router).
          key={`${state}-${slug ?? "new"}`}
          styles={state === "load-error" ? [] : STYLES}
          current={state === "load-error" ? null : current}
          isNew={isNew && state !== "load-error"}
          notFound={Boolean(slug) && !current}
          steps={current ? (STEPS_OF[current.slug] ?? []) : []}
          issues={issues}
          loadError={state === "load-error"}
          basePath="/layouts/admin-styles"
          extraParams={{ state }}
          failSave={state === "save-error"}
          initialEditorStatus={
            state === "save-error"
              ? {
                  tone: "error",
                  text: styleWriteErrorMessage({ message: "" }),
                }
              : undefined
          }
        />
        <section
          aria-labelledby="muestra-estados"
          className="flex flex-col gap-4 rounded-md border border-divider bg-surface p-5"
        >
          <h2 id="muestra-estados" className="type-h4">
            Estados de la muestra
          </h2>
          <p className="type-small text-text-secondary">
            Nada se escribe: guardar, publicar, borrar y las posiciones
            responden con datos falsos.
          </p>
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(STATES) as SampleState[]).map((key) => (
              <li key={key}>
                <Link
                  href={`/layouts/admin-styles?state=${key}`}
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
    </AdminShell>
  );
}
