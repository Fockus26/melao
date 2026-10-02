import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  ProgressView,
  type ProgressViewProps,
} from "@/components/progress/progress-view";
import {
  type ForecastState,
  ReviewForecastCard,
} from "@/components/progress/review-forecast";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import {
  type CoursePath,
  type HardStep,
  type LessonStatus,
  type StyleOption,
  summarizeCourse,
} from "@/lib/course/path";
import type { RecentSession } from "@/lib/progress/progress";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Progreso · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Progreso sin sesión ni base (el real exige cuenta): los estados por `?state=`.
 * Los estilos enlazan a la misma muestra (no cambian los datos). Copy de ejemplo
 * (CONTENT_CHECKLIST fila 39).
 */

const STATES = {
  data: "Con datos",
  "first-day": "Primer día",
  "no-reviews": "Sin repasos en 7 días",
  "no-sessions": "Sin sesiones",
  loading: "Cargando repasos",
  error: "Error en repasos",
} as const;
type SampleState = keyof typeof STATES;

const NOW = "2026-10-02T15:00:00.000Z";
const ago = (days: number, hours = 0) =>
  new Date(
    Date.parse(NOW) - days * 86_400_000 - hours * 3_600_000,
  ).toISOString();

const LESSONS = [
  "La guapea",
  "Entrar y salir de cerrada",
  "Primeras vueltas",
  "Exhíbela y Dame",
  "Vacílala y Sombrero",
  "El setenta",
];

function samplePath(done: number): CoursePath {
  const lessons = LESSONS.map((title, i) => {
    const n = i + 1;
    const status: LessonStatus =
      n <= done ? "completed" : n === done + 1 ? "current" : "locked";
    return {
      unitId: i < 3 ? "u1" : "u2",
      unitPosition: i < 3 ? 1 : 2,
      unitTitle: i < 3 ? "Fundamentos" : "Primeras figuras",
      lessonId: `sample-${n}`,
      lessonPosition: (i % 3) + 1,
      number: n,
      title,
      stepCount: 2,
      status,
    };
  });
  return { courseId: "sample", lessonCount: lessons.length, lessons };
}

const STYLES = (done: number): StyleOption[] => [
  {
    id: "salsa-casino",
    name: "Salsa casino",
    hasRoles: true,
    chosen: true,
    hasCourse: true,
    lessonCount: 6,
    completedCount: done,
  },
  {
    id: "merengue",
    name: "Merengue",
    hasRoles: true,
    chosen: true,
    hasCourse: true,
    lessonCount: 6,
    completedCount: 0,
  },
];

const HARDEST: HardStep[] = [
  {
    id: "h1",
    slug: "enchufla",
    name: "Enchufla",
    difficulty: 2,
    lastRating: 1,
    lastReviewedAt: ago(2),
  },
  {
    id: "h2",
    slug: "dile-que-no",
    name: "Dile que no",
    difficulty: 2,
    lastRating: 2,
    lastReviewedAt: ago(1),
  },
  {
    id: "h3",
    slug: "vacilala",
    name: "Vacílala con vuelta por detrás y sombrero doble",
    difficulty: 4,
    lastRating: 2,
    lastReviewedAt: ago(6),
  },
];

const SESSIONS: RecentSession[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    mode: "free",
    styleName: "Salsa casino",
    songTitle: "Pista de prueba · Son montuno a 96 BPM",
    lessonTitle: null,
    createdAt: ago(0, 2),
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    mode: "lesson",
    styleName: "Salsa casino",
    songTitle: "Pista de prueba · Guaguancó a 92 BPM",
    lessonTitle: "Primeras vueltas",
    createdAt: ago(1),
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    mode: "free",
    styleName: "Merengue",
    songTitle: null,
    lessonTitle: null,
    createdAt: ago(4),
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    mode: "lesson",
    styleName: "Salsa casino",
    songTitle: "Pista de prueba · Salsa dura a 104 BPM",
    lessonTitle: "Entrar y salir de cerrada",
    createdAt: ago(9),
  },
];

const day = (offset: number) =>
  new Date(Date.parse(NOW) + offset * 86_400_000).toISOString().slice(0, 10);
const FORECAST = [4, 0, 2, 7, 0, 1, 3].map((dueCount, i) => ({
  day: day(i),
  dueCount,
}));

function propsFor(
  state: SampleState,
): Omit<ProgressViewProps, "forecast"> & { forecast: ForecastState } {
  const done = state === "first-day" ? 0 : 2;
  const styles = STYLES(done);
  const base = {
    styles,
    style: styles[0],
    course: summarizeCourse(samplePath(done)),
    counts: { unknown: 14, learning: 5, known: 3, total: 22 },
    hardest: HARDEST,
    sessions: SESSIONS,
    now: new Date(NOW),
    styleHref: () => `/layouts/progress?state=${state}`,
    forecast: { status: "ready", days: FORECAST } as ForecastState,
  };
  switch (state) {
    case "first-day":
      return {
        ...base,
        counts: { unknown: 22, learning: 0, known: 0, total: 22 },
        hardest: [],
        sessions: [],
        forecast: {
          status: "ready",
          days: FORECAST.map((d) => ({ ...d, dueCount: 0 })),
        },
      };
    case "no-reviews":
      return {
        ...base,
        forecast: {
          status: "ready",
          days: FORECAST.map((d) => ({ ...d, dueCount: 0 })),
        },
      };
    case "no-sessions":
      return { ...base, sessions: [] };
    case "loading":
      return { ...base, forecast: { status: "loading" } };
    case "error":
      return { ...base, forecast: { status: "error" } };
    default:
      return base;
  }
}

export default async function ProgressSample(
  props: PageProps<"/layouts/progress">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "data";
  const { forecast, ...rest } = propsFor(state);

  return (
    <AppShell
      currentPath="/app/progress"
      plan={{ name: "Básico", status: "activo" }}
    >
      <div className="flex flex-col gap-12">
        <ProgressView
          key={state}
          {...rest}
          forecast={<ReviewForecastCard state={forecast} />}
        />
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
                  href={`/layouts/progress?state=${key}`}
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
