import type { Metadata } from "next";
import Link from "next/link";
import { CourseView, type CourseViewProps } from "@/components/app/course-view";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import type { CoursePath, LessonStatus, StyleOption } from "@/lib/course/path";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Curso · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Curso sin sesión ni base (el real exige cuenta): los estados por `?state=`, con
 * un curso de ejemplo. El Sheet de estilo funciona pero no escribe nada.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 39).
 */

const STATES = {
  progress: "Con repaso",
  "no-reviews": "Sin repasos",
  "first-day": "Primer día",
  available: "Lección disponible",
  finished: "Curso terminado",
  "no-subscription": "Sin suscripción",
  "no-course": "Estilo sin curso",
  "no-styles": "Sin estilos",
} as const;
type SampleState = keyof typeof STATES;

const UNITS = [
  {
    id: "u1",
    title: "Fundamentos",
    lessons: ["La guapea", "Entrar y salir de cerrada", "Primeras vueltas"],
  },
  {
    id: "u2",
    title: "Primeras figuras",
    lessons: ["Enchufla", "Vacílala y Sombrero", "El setenta"],
  },
];

/** Camino de 6 lecciones: `completed` son los números completados; la actual, el primero que falta. */
function samplePath(completed: readonly number[]): CoursePath {
  const done = new Set(completed);
  let current = 0;
  for (let n = 1; n <= 6 && current === 0; n++) if (!done.has(n)) current = n;
  let n = 0;
  const lessons = UNITS.flatMap((unit, u) =>
    unit.lessons.map((title, i) => {
      n += 1;
      // Como `private.lesson_unlocked`: la anterior completada desbloquea (D092).
      const status: LessonStatus = done.has(n)
        ? "completed"
        : n === current
          ? "current"
          : done.has(n - 1)
            ? "available"
            : "locked";
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

function propsFor(state: SampleState): CourseViewProps {
  const completed =
    state === "first-day"
      ? []
      : state === "finished"
        ? [1, 2, 3, 4, 5, 6]
        : state === "available"
          ? [1, 3]
          : [1, 2];
  const all = styles(completed.length);
  const base: CourseViewProps = {
    styles: all,
    currentStyle: all[0],
    role: "leader",
    mode: "sample",
    subscribed: true,
    path: samplePath(completed),
    due: DUE,
  };
  switch (state) {
    case "no-reviews":
    case "first-day":
      return { ...base, due: [] };
    case "available":
      return { ...base, due: DUE.slice(0, 1) };
    case "finished":
      return { ...base, due: DUE.slice(0, 2) };
    case "no-subscription":
      return { ...base, subscribed: false };
    case "no-course":
      return { ...base, currentStyle: all[1], path: null, due: [] };
    case "no-styles":
      return { ...base, styles: [], currentStyle: null, path: null, due: [] };
    default:
      return base;
  }
}

export default async function CourseSample(
  props: PageProps<"/layouts/course">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "progress";

  return (
    <AppShell
      currentPath="/app/course"
      plan={{ name: "Básico", status: "activo" }}
    >
      <div className="flex flex-col gap-12">
        <CourseView key={state} {...propsFor(state)} />
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
                  href={`/layouts/course?state=${key}`}
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
