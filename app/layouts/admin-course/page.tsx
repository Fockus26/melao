import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/layout/admin-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { courseErrorMessage, courseSearch } from "@/lib/admin/course";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import {
  LESSONS,
  MERENGUE,
  MERENGUE_COURSE,
  SALSA,
  SALSA_COURSE,
} from "./data";
import { CourseAdminSample } from "./sample-view";

export const metadata: Metadata = {
  title: "Admin, camino · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Admin · Camino sin sesión ni base (la real exige rol admin): el Constructor del
 * camino con 3 unidades y 8 lecciones de salsa casino, por `?state=`. Reordenar, crear, guardar y
 * borrar responden con un puerto falso en memoria (nada se escribe). Merengue sale sin curso.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 91).
 */

const STATES = {
  path: { label: "Camino", style: SALSA.slug, lesson: null },
  valid: { label: "Lección válida", style: SALSA.slug, lesson: LESSONS.valid },
  warning: {
    label: "Aviso de secuencia",
    style: SALSA.slug,
    lesson: LESSONS.warning,
  },
  "no-song": {
    label: "Sin canción ni pasos",
    style: SALSA.slug,
    lesson: LESSONS.noSong,
  },
  "no-course": {
    label: "Estilo sin curso",
    style: MERENGUE.slug,
    lesson: null,
  },
  "save-error": {
    label: "Error al guardar",
    style: SALSA.slug,
    lesson: LESSONS.valid,
  },
  "load-error": { label: "Error al cargar", style: SALSA.slug, lesson: null },
} as const;
type SampleState = keyof typeof STATES;

export default async function AdminCourseSamplePage(
  props: PageProps<"/layouts/admin-course">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "path";
  const style = firstParam(params.style) === MERENGUE.slug ? MERENGUE : SALSA;

  return (
    <AdminShell currentPath="/admin/course">
      <div className="flex flex-col gap-12">
        <CourseAdminSample
          // Cada estado y cada estilo montan la vista de nuevo (con el camino de partida).
          key={`${state}-${style.slug}`}
          styles={[SALSA, MERENGUE]}
          currentStyle={style}
          data={style === SALSA ? SALSA_COURSE : MERENGUE_COURSE}
          loadError={state === "load-error"}
          basePath="/layouts/admin-course"
          extraParams={{ state }}
          failSave={state === "save-error"}
          initialEditorStatus={
            state === "save-error"
              ? { tone: "error", text: courseErrorMessage({ message: "" }) }
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
            Nada se escribe: reordenar, crear, guardar y borrar responden con
            datos en memoria (se pierden al recargar).
          </p>
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(STATES) as SampleState[]).map((key) => (
              <li key={key}>
                <Link
                  href={`/layouts/admin-course${courseSearch(
                    { style: STATES[key].style, lesson: STATES[key].lesson },
                    { state: key },
                  )}`}
                  aria-current={key === state ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-12 items-center rounded-pill border px-4 type-small",
                    key === state
                      ? "border-primary bg-primary font-semibold text-on-primary"
                      : "border-border-input text-text hover:bg-hover",
                  )}
                >
                  {STATES[key].label}
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
