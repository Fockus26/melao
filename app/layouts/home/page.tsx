import type { Metadata } from "next";
import Link from "next/link";
import { HomeView, type HomeViewProps } from "@/components/app/home-view";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import {
  type CoursePath,
  type LessonStatus,
  type StyleOption,
  summarizeCourse,
} from "@/lib/course/path";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inicio · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Inicio sin sesión ni base (el real exige cuenta): los estados por `?state=`, con
 * el curso del seed. El Sheet de estilo funciona pero no escribe nada.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 39).
 */

const STATES = {
  review: "Con repasos",
  "first-day": "Primer día",
  "no-reviews": "Sin repasos",
  finished: "Curso terminado",
  "no-subscription": "Sin suscripción",
  "no-course": "Estilo sin curso",
} as const;
type SampleState = keyof typeof STATES;

const NOW = "2026-09-30T15:00:00.000Z";
const daysAgo = (n: number) =>
  new Date(Date.parse(NOW) - n * 86_400_000).toISOString();

const UNITS = [
  {
    id: "u1",
    title: "Fundamentos",
    lessons: ["La guapea", "Entrar y salir de cerrada", "Primeras vueltas"],
  },
  {
    id: "u2",
    title: "Primeras figuras",
    lessons: ["Exhíbela y Dame", "Vacílala y Sombrero", "El setenta"],
  },
];

/** Camino de 6 lecciones con `done` completadas en orden. */
function samplePath(done: number): CoursePath {
  let n = 0;
  const lessons = UNITS.flatMap((unit, u) =>
    unit.lessons.map((title, i) => {
      n += 1;
      const status: LessonStatus =
        n <= done ? "completed" : n === done + 1 ? "current" : "locked";
      return {
        unitId: unit.id,
        unitPosition: u + 1,
        unitTitle: unit.title,
        lessonId: `sample-${n}`,
        lessonPosition: i + 1,
        number: n,
        title,
        stepCount: 2,
        status,
      };
    }),
  );
  return { courseId: "sample", lessonCount: lessons.length, lessons };
}

const styles = (done: number): StyleOption[] => [
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
    chosen: false,
    hasCourse: true,
    lessonCount: 6,
    completedCount: 0,
  },
  {
    id: "rueda",
    name: "Rueda de casino",
    hasRoles: true,
    chosen: false,
    hasCourse: false,
    lessonCount: 0,
    completedCount: 0,
  },
];

const DUE = [
  { id: "s1", slug: "enchufla", name: "Enchufla" },
  { id: "s2", slug: "dile-que-no", name: "Dile que no" },
  { id: "s3", slug: "vuelta-derecha", name: "Vuelta a la derecha" },
  { id: "s4", slug: "guapea", name: "Guapea" },
  { id: "s5", slug: "dile-que-si", name: "Dile que sí" },
  { id: "s6", slug: "basico-cerrada", name: "Básico en cerrada" },
];

const HARDEST: HomeViewProps["hardest"] = [
  {
    id: "h1",
    slug: "enchufla",
    name: "Enchufla",
    difficulty: 2,
    lastRating: 1,
    lastReviewedAt: daysAgo(2),
  },
  {
    id: "h2",
    slug: "dile-que-no",
    name: "Dile que no",
    difficulty: 2,
    lastRating: 2,
    lastReviewedAt: daysAgo(1),
  },
  {
    id: "h3",
    slug: "vuelta-derecha",
    name: "Vuelta a la derecha",
    difficulty: 2,
    lastRating: 2,
    lastReviewedAt: daysAgo(6),
  },
];

function propsFor(state: SampleState): HomeViewProps {
  const done = state === "first-day" ? 0 : state === "finished" ? 6 : 2;
  const all = styles(done);
  const base: HomeViewProps = {
    name: "Laura",
    date: NOW,
    now: new Date(NOW),
    styles: all,
    currentStyle: all[0],
    role: "leader",
    mode: "sample",
    subscribed: true,
    course: summarizeCourse(samplePath(done)),
    due: DUE,
    hardest: HARDEST,
  };
  switch (state) {
    case "first-day":
      return { ...base, due: [], hardest: [] };
    case "no-reviews":
      return { ...base, due: [] };
    case "finished":
      return { ...base, due: DUE.slice(0, 2) };
    case "no-subscription":
      return { ...base, subscribed: false };
    case "no-course":
      return {
        ...base,
        currentStyle: all[2],
        course: null,
        due: [],
        hardest: [],
      };
    default:
      return base;
  }
}

export default async function HomeSample(props: PageProps<"/layouts/home">) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "review";

  return (
    <AppShell currentPath="/app" plan={{ name: "Básico", status: "activo" }}>
      <div className="flex flex-col gap-12">
        <HomeView key={state} {...propsFor(state)} />
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
                  href={`/layouts/home?state=${key}`}
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
