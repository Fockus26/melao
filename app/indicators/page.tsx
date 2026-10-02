import type { Metadata } from "next";
import { BeatRow } from "@/components/indicators/beat-row";
import { Difficulty } from "@/components/indicators/difficulty";
import { LessonProgress } from "@/components/indicators/lesson-progress";
import { PathNode } from "@/components/indicators/path-node";
import { StepStatus } from "@/components/indicators/step-status";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { DIFFICULTY_NAMES, DIFFICULTY_OPTIONS } from "@/lib/difficulty";
import { BeatRowDemo, RatingDemo } from "./demos";

/**
 * Muestra de indicadores propios (handoff §7 paso 3): cada uno con todos sus estados, en claro y
 * oscuro. Interna como /primitives: sin enlace desde la app y fuera de buscadores.
 * Copy de ejemplo: placeholder realista (CONTENT_CHECKLIST fila 35).
 */
export const metadata: Metadata = {
  title: "Indicadores",
  robots: { index: false, follow: false },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="flex flex-col gap-6 border-t border-divider pt-8"
    >
      <h2 id={`${id}-titulo`} className="type-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Demo({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="type-overline text-text-secondary">{title}</h3>
      {children}
    </div>
  );
}

export default function IndicadoresPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-12 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-4">
        <p className="type-eyebrow text-gold-700">Referencia interna</p>
        <h1 className="type-display">Indicadores de Melao</h1>
        <p className="type-body max-w-prose text-text-secondary">
          Componentes propios sin equivalente en shadcn/ui: dificultad, estado
          del paso, progreso, camino, calificación y tira de tiempos. Los textos
          son de ejemplo.
        </p>
        <ThemeSwitch />
      </header>

      <Section id="dificultad" title="Difficulty">
        <div className="grid gap-8 md:grid-cols-2">
          <Demo title="Con número">
            <ul className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <li key={level}>
                  <Difficulty level={level} />
                </li>
              ))}
            </ul>
          </Demo>
          <Demo title="Con nombre (lista de canciones)">
            <ul className="flex flex-col gap-2">
              {DIFFICULTY_OPTIONS.map((level) => (
                <li key={level}>
                  <Difficulty level={level} label={DIFFICULTY_NAMES[level]} />
                </li>
              ))}
            </ul>
          </Demo>
        </div>
      </Section>

      <Section id="estado-paso" title="StepStatus">
        <ul className="flex flex-wrap gap-6">
          <li>
            <StepStatus status="unknown" />
          </li>
          <li>
            <StepStatus status="learning" />
          </li>
          <li>
            <StepStatus status="known" />
          </li>
        </ul>
      </Section>

      <Section id="progreso" title="LessonProgress">
        <div className="flex max-w-md flex-col gap-4">
          <LessonProgress completed={0} total={6} />
          <LessonProgress completed={2} total={6} />
          <LessonProgress completed={6} total={6} />
        </div>
      </Section>

      <Section id="camino" title="PathNode">
        <ol className="flex max-w-2xl flex-col gap-2">
          <li>
            <PathNode
              state="completed"
              number={1}
              title="Paso básico"
              label="Lección 1"
              href="#camino"
            />
          </li>
          <li>
            <PathNode
              state="review"
              number={2}
              title="Repaso: Guapea y Dile que no"
              label="Lección 2"
              href="#camino"
            />
          </li>
          <li>
            <PathNode
              state="current"
              number={3}
              title="Enchufla"
              label="Lección 3"
              href="#camino"
            />
          </li>
          <li>
            <PathNode
              state="available"
              number={4}
              title="Sombrero"
              label="Lección 4"
              href="#camino"
            />
          </li>
          <li>
            <PathNode
              state="locked"
              number={5}
              title="Setenta"
              label="Lección 5"
            />
          </li>
        </ol>
      </Section>

      <Section id="calificacion" title="RatingButtons">
        <RatingDemo />
      </Section>

      <Section id="tiempos" title="BeatRow (escenario)">
        <div className="grid gap-8 lg:grid-cols-2">
          <Demo title="Salsa casino, animable">
            <BeatRowDemo />
          </Demo>
          <Demo title="Tiempo silencioso activo (4)">
            <div className="rounded-md bg-stage-bg px-5 py-7">
              <BeatRow
                beatsPerPhrase={8}
                silentBeats={[4, 8]}
                activeBeat={4}
                label="Tiempos de la frase, en el 4"
              />
            </div>
          </Demo>
          <Demo title="Merengue: se cuentan los 8">
            <div className="rounded-md bg-stage-bg px-5 py-7">
              <BeatRow
                beatsPerPhrase={8}
                activeBeat={6}
                label="Tiempos de la frase de merengue"
              />
            </div>
          </Demo>
          <Demo title="Antes de empezar (ninguno activo)">
            <div className="rounded-md bg-stage-bg px-5 py-7">
              <BeatRow
                beatsPerPhrase={8}
                silentBeats={[4, 8]}
                activeBeat={null}
                label="Tiempos de la frase, sin empezar"
              />
            </div>
          </Demo>
        </div>
      </Section>
    </main>
  );
}
