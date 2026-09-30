import type { Metadata } from "next";
import Link from "next/link";
import { LessonLocked } from "@/components/lesson/lesson-locked";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { LessonSample } from "./lesson-sample";
import { SAMPLE_LESSON, type SampleStage } from "./sample-data";

export const metadata: Metadata = {
  title: "Lección · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de la lección (`/app/lessons/[id]`) sin sesión ni base: cada etapa por `?stage=`, con
 * un backend falso (el flujo sigue funcionando desde cualquier etapa). Bajo el pliegue, el
 * selector de etapa y el tema, como en `/stage`. Copy de ejemplo (CONTENT_CHECKLIST fila 39).
 */

const STAGES = {
  intro: "1 · Intro",
  video: "2 · Video del paso",
  practice: "3 · Mini práctica",
  final: "4 · Práctica final",
  rating: "5 · Calificación",
  summary: "6 · Resumen",
  locked: "Bloqueada",
  unavailable: "Práctica disponible pronto",
} as const;
type Stage = keyof typeof STAGES;

export default async function LessonSamplePage(
  props: PageProps<"/layouts/lesson">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.stage);
  const stage: Stage = raw && raw in STAGES ? (raw as Stage) : "intro";

  return (
    <>
      {stage === "locked" ? (
        <LessonLocked
          title={SAMPLE_LESSON.title}
          number={SAMPLE_LESSON.number}
          courseHref="/layouts"
        />
      ) : (
        <LessonSample key={stage} stage={stage as SampleStage} />
      )}
      <nav
        aria-labelledby="etapas-titulo"
        className="flex flex-col gap-6 bg-bg px-5 py-8 text-text"
      >
        <div className="mx-auto flex w-full max-w-160 flex-col gap-6">
          <h2 id="etapas-titulo" className="type-h2">
            Etapas de la lección
          </h2>
          <p className="type-small text-text-secondary">
            Backend falso: la práctica usa el motor falso (sin audio) con un
            plan fijo y calificar no guarda nada.
          </p>
          <ul className="flex flex-col gap-1">
            {(Object.keys(STAGES) as Stage[]).map((id) => (
              <li key={id}>
                <Link
                  href={`/layouts/lesson?stage=${id}`}
                  aria-current={id === stage ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center rounded-md px-3 type-body text-text hover:bg-hover",
                    id === stage &&
                      "bg-gold-tint font-semibold underline decoration-gold-500 underline-offset-5",
                  )}
                >
                  {STAGES[id]}
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
        </div>
      </nav>
    </>
  );
}
