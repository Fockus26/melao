import { ChevronRight, Metronome } from "lucide-react";
import Link from "next/link";
import { Difficulty } from "@/components/indicators/difficulty";
import { LessonProgress } from "@/components/indicators/lesson-progress";
import { RATING_LABELS } from "@/components/indicators/rating-labels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ICON_STROKE } from "@/components/ui/icon";
import {
  type CourseSummary,
  type DanceRole,
  type DueStep,
  type HardStep,
  relativeDays,
  reviewMinutes,
  type StyleOption,
  stepNamesLine,
} from "@/lib/course/path";
import { StyleSheet } from "./style-sheet";
import { TodayLabel } from "./today-label";

/** Destinos de Inicio (D077: rutas en inglés). Algunos llegan en pantallas posteriores. */
export const HOME_LINKS = {
  review: "/app/practice?mode=review",
  practice: "/app/practice",
  plans: "/plans",
  course: "/app/course",
  progress: "/app/progress",
  lesson: (id: string) => `/app/lessons/${id}`,
  step: (slug: string) => `/app/steps/${slug}`,
} as const;

// Copy provisional (CONTENT_CHECKLIST fila 53).
const COPY = {
  hello: (name: string | null) => (name ? `Hola, ${name}` : "Hola"),
  today: "Para hoy",
  minutes: (n: number) => `Unos ${n} min`,
  dueUnit: (n: number) => (n === 1 ? "paso por repasar" : "pasos por repasar"),
  review: "Repasar",
  nothingDue: "Nada por repasar hoy",
  nothingDueText:
    "Tus pasos están frescos. Vuelve mañana o haz una práctica rápida.",
  firstDay: "Tu primer repaso llega después de tu primera lección.",
  firstDayCta: (n: number) => `Empezar la lección ${n}`,
  locked: "Los repasos y la práctica con el coach son parte del plan.",
  activate: "Activa tu plan",
  continue: "Continuar",
  start: "Empezar",
  lessonOf: (n: number, total: number) => `Lección ${n} de ${total}`,
  unit: (position: number, title: string) => `Unidad ${position} · ${title}`,
  unitProgressLabel: "Progreso de la unidad",
  unitProgressValue: (done: number, total: number) =>
    `${done} de ${total} lecciones de la unidad`,
  finished: (style: string) => `Terminaste el curso de ${style}.`,
  finishedText: "Repasa lo aprendido o elige otro estilo.",
  seeCourse: "Ver el curso",
  noCourse: (style: string) => `${style} todavía no tiene curso.`,
  noCourseText: "Elige otro estilo arriba o vuelve pronto.",
  noStyle: "Elige un estilo para empezar.",
  quick: "Práctica rápida",
  quickText: "Una canción y los pasos que ya sabes, con el coach contando.",
  practice: "Practicar",
  hardest: "Lo que más te cuesta",
  seeProgress: "Ver progreso",
  lastTime: (rating: string, when: string) => `Última vez: ${rating} · ${when}`,
  hardestEmpty:
    "Cuando califiques tus prácticas, aquí vas a ver los pasos que más te cuestan.",
} as const;

export type HomeViewProps = {
  name: string | null;
  /** Fecha fija para la muestra; en la real, la del dispositivo. */
  date?: string;
  /** "Ahora" para "hace 2 días". */
  now: Date;
  styles: readonly StyleOption[];
  currentStyle: StyleOption | null;
  role: DanceRole | null;
  userId?: string;
  mode?: "live" | "sample";
  subscribed: boolean;
  /** Camino del estilo resumido; `null` si el estilo no tiene curso publicado. */
  course: CourseSummary | null;
  due: readonly DueStep[];
  hardest: readonly HardStep[];
};

/**
 * Inicio (handoff § Inicio): encabezado con fecha, saludo y chip de estilo; Para hoy y Continuar
 * en 1/2 columnas; Práctica rápida; Lo que más te cuesta. Solo presenta: los datos llegan ya
 * resueltos por las funciones SQL (D003). La usan `/app` y la muestra `/layouts/home`.
 */
export function HomeView(props: HomeViewProps) {
  const { name, date, styles, currentStyle, role, userId, mode } = props;
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <TodayLabel
            date={date}
            className="type-overline text-text-secondary"
          />
          <h1 className="type-display">{COPY.hello(name)}</h1>
        </div>
        {styles.length > 0 ? (
          <StyleSheet
            styles={styles}
            currentStyleId={currentStyle?.id ?? null}
            role={role}
            userId={userId}
            mode={mode}
          />
        ) : null}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <TodayCard {...props} />
        <ContinueCard {...props} />
        <QuickPracticeCard subscribed={props.subscribed} />
      </div>

      <HardestSection hardest={props.hardest} now={props.now} />
    </div>
  );
}

function CardHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="type-eyebrow text-text-secondary">
      {children}
    </h2>
  );
}

function TodayCard({ subscribed, course, due }: HomeViewProps) {
  const firstDay = !!course && course.completedCount === 0 && due.length === 0;
  return (
    <Card className="min-w-0 justify-between">
      <div className="flex items-baseline justify-between gap-4">
        <CardHeading id="home-today">{COPY.today}</CardHeading>
        {subscribed && due.length > 0 ? (
          <p className="type-small text-text-secondary">
            {COPY.minutes(reviewMinutes(due.length))}
          </p>
        ) : null}
      </div>
      {!subscribed ? (
        <>
          <p className="type-body text-text-secondary">{COPY.locked}</p>
          <Button asChild className="self-start">
            <Link href={HOME_LINKS.plans}>{COPY.activate}</Link>
          </Button>
        </>
      ) : due.length > 0 ? (
        <>
          <div className="flex flex-col gap-1">
            <p className="flex items-baseline gap-3">
              <span className="type-numeric-xl">{due.length}</span>
              <span className="type-body text-text-secondary">
                {COPY.dueUnit(due.length)}
              </span>
            </p>
            <p className="truncate type-small text-text-secondary">
              {stepNamesLine(due)}
            </p>
          </div>
          <Button asChild className="self-start">
            <Link href={HOME_LINKS.review}>{COPY.review}</Link>
          </Button>
        </>
      ) : firstDay && course?.current ? (
        <>
          <p className="type-body text-text-secondary">{COPY.firstDay}</p>
          <Button asChild variant="outline" className="self-start">
            <Link href={HOME_LINKS.lesson(course.current.lessonId)}>
              {COPY.firstDayCta(course.current.number)}
            </Link>
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="type-h3">{COPY.nothingDue}</p>
          <p className="type-small text-text-secondary">
            {COPY.nothingDueText}
          </p>
        </div>
      )}
    </Card>
  );
}

function ContinueCard({ course, currentStyle }: HomeViewProps) {
  const styleName = currentStyle?.name ?? "";
  const current = course?.current ?? null;
  return (
    <Card className="min-w-0 justify-between">
      <CardHeading id="home-continue">{COPY.continue}</CardHeading>
      {!currentStyle ? (
        <p className="type-body text-text-secondary">{COPY.noStyle}</p>
      ) : !course ? (
        <div className="flex flex-col gap-1">
          <p className="type-h3">{COPY.noCourse(styleName)}</p>
          <p className="type-small text-text-secondary">{COPY.noCourseText}</p>
        </div>
      ) : course.finished || !current ? (
        <>
          <div className="flex flex-col gap-1">
            <p className="type-h3">{COPY.finished(styleName)}</p>
            <p className="type-small text-text-secondary">
              {COPY.finishedText}
            </p>
          </div>
          <Button asChild variant="outline" className="self-start">
            <Link href={HOME_LINKS.course}>{COPY.seeCourse}</Link>
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p className="type-small text-text-secondary">
              {COPY.lessonOf(current.number, course.lessonCount)}
            </p>
            <h3 className="type-h2">{current.title}</h3>
          </div>
          {course.unit ? (
            <div className="flex flex-col gap-2">
              <p className="type-small text-text-secondary">
                {COPY.unit(course.unit.position, course.unit.title)}
              </p>
              <LessonProgress
                completed={course.unit.done}
                total={course.unit.total}
                label={COPY.unitProgressLabel}
                valueText={COPY.unitProgressValue(
                  course.unit.done,
                  course.unit.total,
                )}
              />
            </div>
          ) : null}
          <Button asChild className="self-start">
            <Link href={HOME_LINKS.lesson(current.lessonId)}>
              {course.completedCount === 0 ? COPY.start : COPY.continue}
              <span className="sr-only">: {current.title}</span>
            </Link>
          </Button>
        </>
      )}
    </Card>
  );
}

function QuickPracticeCard({ subscribed }: { subscribed: boolean }) {
  return (
    <Card className="flex-row flex-wrap items-center md:col-span-2">
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-text"
      >
        <Metronome strokeWidth={ICON_STROKE} className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
        <h2 id="home-quick" className="type-h4">
          {COPY.quick}
        </h2>
        <p className="type-small text-text-secondary">
          {subscribed ? COPY.quickText : COPY.locked}
        </p>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <Link href={subscribed ? HOME_LINKS.practice : HOME_LINKS.plans}>
          {subscribed ? COPY.practice : COPY.activate}
        </Link>
      </Button>
    </Card>
  );
}

function HardestSection({
  hardest,
  now,
}: {
  hardest: readonly HardStep[];
  now: Date;
}) {
  return (
    <section aria-labelledby="home-hardest" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4 border-b border-divider pb-2">
        <h2 id="home-hardest" className="type-h2">
          {COPY.hardest}
        </h2>
        <Button asChild variant="quiet" className="shrink-0">
          <Link href={HOME_LINKS.progress}>{COPY.seeProgress}</Link>
        </Button>
      </div>
      {hardest.length === 0 ? (
        <p className="py-4 type-small text-text-secondary">
          {COPY.hardestEmpty}
        </p>
      ) : (
        <ul className="flex flex-col">
          {hardest.map((step) => (
            <li key={step.id} className="border-b border-divider">
              <Link
                href={HOME_LINKS.step(step.slug)}
                className="flex min-h-16 items-center gap-4 rounded-md px-2 py-2 transition-colors duration-hover ease-standard hover:bg-hover motion-reduce:transition-none"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="type-h4">{step.name}</span>
                  <span className="type-small text-text-secondary">
                    {COPY.lastTime(
                      RATING_LABELS[step.lastRating],
                      relativeDays(step.lastReviewedAt, now),
                    )}
                  </span>
                </span>
                <Difficulty level={step.difficulty} className="shrink-0" />
                <ChevronRight
                  strokeWidth={ICON_STROKE}
                  aria-hidden="true"
                  className="size-4.5 shrink-0 text-text-secondary"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
