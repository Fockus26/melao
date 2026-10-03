import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { summaryCopy as COPY } from "@/components/admin/summary/copy";
import { SummarySkeleton } from "@/components/admin/summary/summary-skeleton";
import { SummaryView } from "@/components/admin/summary/summary-view";
import { AdminShell } from "@/components/layout/admin-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { Button } from "@/components/ui/button";
import type {
  AdminSummary,
  SummaryItem,
  SummaryState,
  SummaryStyle,
} from "@/lib/admin/summary";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Resumen del admin · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra del Resumen del admin sin sesión ni base (el real exige admin): los estados por
 * `?state=`, con nombres del seed. Los pasos enlazan a `/admin/steps?style=&step=` (sin sesión,
 * lleva a entrar); "Cerrar sesión" aquí no hace nada. Copy de ejemplo (CONTENT_CHECKLIST
 * fila 84).
 */

const STATES = {
  warnings: "Con avisos",
  clean: "Sin avisos",
  empty: "Sin contenido",
  error: "Error al leer",
  loading: "Cargando",
} as const;
type SampleState = keyof typeof STATES;

const SALSA = "salsa-casino";
const MERENGUE = "merengue";

const style = (
  slug: string,
  name: string,
  published: boolean,
  counts: [number, number, number, number, number, number],
): SummaryStyle => ({
  id: slug,
  slug,
  name,
  published,
  stepsPublished: counts[0],
  stepsTotal: counts[1],
  songsPublished: counts[2],
  songsTotal: counts[3],
  lessonsPublished: counts[4],
  lessonsTotal: counts[5],
});

const item = (
  kind: SummaryItem["kind"],
  id: string,
  name: string,
  styleSlug: string | null,
  reasons: string[],
  expiresOn: string | null = null,
): SummaryItem => ({ kind, id, name, style: styleSlug, reasons, expiresOn });

const WARNINGS: SummaryItem[] = [
  item("step", "s1", "Enchufla", SALSA, ["missing_video"]),
  item("step", "s2", "Dile que no", SALSA, ["missing_video"]),
  item("step", "s3", "Setenta", SALSA, ["missing_video"]),
  item("step", "s4", "Sombrero", SALSA, ["missing_video"]),
  item("step", "s5", "Vuelta de la dama", MERENGUE, ["missing_video"]),
  item(
    "song",
    "c1",
    "Pista de prueba 2 · casino medio",
    SALSA,
    ["license_expired"],
    "2026-09-28",
  ),
  item(
    "song",
    "c2",
    "Pista de prueba 5 · merengue rápido",
    MERENGUE,
    ["license_expiring"],
    "2026-10-20",
  ),
  item("lesson", "l1", "Primeras vueltas", SALSA, ["song_unavailable"]),
  item("lesson", "l2", "El setenta", SALSA, [
    "step_unpublished",
    "song_unavailable",
  ]),
  item("lesson", "l3", "Manos cruzadas y candado", MERENGUE, ["missing_song"]),
];

const PENDING: SummaryItem[] = [
  item("step", "s6", "Enchufla doble", SALSA, ["missing_video"]),
  item("step", "s7", "Exhibe", SALSA, []),
  item("song", "c3", "Pista de prueba 3 · casino rápido", SALSA, [
    "missing_audio",
    "missing_license",
  ]),
  item("song", "c4", "Pista de prueba 6 · sin estilo", null, [
    "missing_audio",
    "missing_grid",
    "missing_dance_end",
    "missing_license",
  ]),
  item("style", "bachata", "Bachata", "bachata", ["missing_start_position"]),
];

const FULL: AdminSummary = {
  styles: [
    style(SALSA, "Salsa casino", true, [16, 18, 2, 3, 6, 6]),
    style(MERENGUE, "Merengue", true, [11, 12, 1, 2, 6, 6]),
    style("bachata", "Bachata", false, [0, 0, 0, 0, 0, 0]),
  ],
  totals: {
    stepsPublished: 27,
    stepsTotal: 30,
    songsPublished: 3,
    songsTotal: 6,
    lessonsPublished: 12,
    lessonsTotal: 12,
    students: 148,
    studentsActive: 96,
  },
  warnings: WARNINGS,
  pending: PENDING,
};

function stateFor(state: Exclude<SampleState, "loading">): SummaryState {
  switch (state) {
    case "clean":
      return {
        status: "ready",
        summary: {
          ...FULL,
          styles: FULL.styles.slice(0, 2),
          totals: { ...FULL.totals, stepsPublished: 30, stepsTotal: 30 },
          warnings: [],
          pending: [],
        },
      };
    case "empty":
      return {
        status: "ready",
        summary: {
          styles: [],
          totals: {
            stepsPublished: 0,
            stepsTotal: 0,
            songsPublished: 0,
            songsTotal: 0,
            lessonsPublished: 0,
            lessonsTotal: 0,
            students: 0,
            studentsActive: 0,
          },
          warnings: [],
          pending: [],
        },
      };
    case "error":
      return { status: "error" };
    default:
      return { status: "ready", summary: FULL };
  }
}

export default async function AdminSummarySample(
  props: PageProps<"/layouts/admin-summary">,
) {
  const raw = firstParam((await props.searchParams).state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "warnings";

  return (
    <AdminShell currentPath="/admin">
      <div className="flex flex-col gap-8">
        <AdminPageHeader
          overline={COPY.overline}
          title={COPY.title}
          actions={
            <Button type="button" variant="outline">
              Cerrar sesión
            </Button>
          }
        />
        {state === "loading" ? (
          <SummarySkeleton />
        ) : (
          <SummaryView state={stateFor(state)} />
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
                  href={`/layouts/admin-summary?state=${key}`}
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
