import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { PathNode } from "@/components/indicators/path-node";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ICON_STROKE } from "@/components/ui/icon";
import {
  type CoursePath,
  type DanceRole,
  type DueStep,
  type PathLesson,
  reviewMinutes,
  type StyleOption,
} from "@/lib/course/path";
import { groupPathByUnit, reviewPlacement } from "@/lib/course/units";
import { HOME_LINKS } from "./home-view";
import { StyleSheet } from "./style-sheet";

// Copy provisional (CONTENT_CHECKLIST fila 55).
const COPY = {
  eyebrow: "Tu curso · cambiar estilo",
  title: "Tu curso",
  noStyles: "Todavía no hay estilos publicados. Vuelve pronto.",
  noCourse: (style: string) => `${style} todavía no tiene curso.`,
  noCourseText: "Toca el título para elegir otro estilo o vuelve pronto.",
  locked: "Los repasos y la práctica con el coach son parte del plan.",
  activate: "Activa tu plan",
  finished: (style: string) => `Terminaste el curso de ${style}.`,
  finishedText: "Repite cualquier lección cuando quieras o elige otro estilo.",
  unit: (n: number) => `Unidad ${n}`,
  unitCount: (done: number, total: number) => `${done} de ${total}`,
  unitCountSr: " lecciones completadas",
  lesson: (n: number) => `Lección ${n}`,
  continue: "Continuar",
  start: "Empezar",
  lessonAction: (action: string, n: number, title: string) =>
    `${action} lección ${n}: ${title}`,
  reviewTitle: "Repaso de hoy",
  reviewDue: (n: number) =>
    n === 1 ? "1 paso vence hoy" : `${n} pasos vencen hoy`,
  reviewMinutes: (n: number) => `Unos ${n} min`,
  review: "Repasar",
  reviewLocked: (due: string) => `Activa tu plan para repasar: ${due}`,
} as const;

export type CourseViewProps = {
  styles: readonly StyleOption[];
  currentStyle: StyleOption | null;
  role: DanceRole | null;
  userId?: string;
  mode?: "live" | "sample";
  subscribed: boolean;
  /** Camino del estilo (`course_path`); `null` si el estilo no tiene curso publicado. */
  path: CoursePath | null;
  /** Pasos vencidos hoy (`due_steps`): el nodo de repaso sale solo si hay alguno. */
  due: readonly DueStep[];
};

/** "Salsa *casino*": la última palabra en cursiva (display del handoff); una sola, sin cursiva. */
function StyleName({ name }: { name: string }) {
  const cut = name.lastIndexOf(" ");
  if (cut < 0) return name;
  return (
    <>
      {name.slice(0, cut + 1)}
      <em>{name.slice(cut + 1)}</em>
    </>
  );
}

/**
 * Curso (handoff § Curso): el título es el selector de estilo (abre "Elige tu estilo") y debajo
 * el camino por unidades con un PathNode por lección. El nodo de repaso sale solo con pasos
 * vencidos, antes de la lección actual. Solo presenta: estados y vencidos llegan resueltos por
 * `course_path` y `due_steps` (D003, D092). La usan `/app/course` y la muestra `/layouts/course`.
 */
export function CourseView(props: CourseViewProps) {
  const { currentStyle, path, subscribed } = props;
  const finished =
    !!path &&
    path.lessons.length > 0 &&
    path.lessons.every((l) => l.status === "completed");

  return (
    <div className="flex flex-col gap-8">
      <CourseTitle {...props} />

      {/* Sin estilo actual solo si no hay estilos publicados (pickCurrentStyle). */}
      {!currentStyle ? (
        <p className="type-body text-text-secondary">{COPY.noStyles}</p>
      ) : !path || path.lessons.length === 0 ? (
        <Card className="gap-1">
          <p className="type-h3">{COPY.noCourse(currentStyle.name)}</p>
          <p className="type-small text-text-secondary">{COPY.noCourseText}</p>
        </Card>
      ) : (
        <>
          {finished ? (
            <Card className="gap-1">
              <p className="type-h3">{COPY.finished(currentStyle.name)}</p>
              <p className="type-small text-text-secondary">
                {COPY.finishedText}
              </p>
            </Card>
          ) : null}
          {!subscribed ? (
            <Card className="flex-row flex-wrap items-center">
              <p className="min-w-0 flex-1 basis-48 type-small text-text-secondary">
                {COPY.locked}
              </p>
              <Button asChild variant="outline" className="shrink-0">
                <Link href={HOME_LINKS.plans}>{COPY.activate}</Link>
              </Button>
            </Card>
          ) : null}
          <CoursePathList {...props} path={path} />
        </>
      )}
    </div>
  );
}

function CourseTitle({
  styles,
  currentStyle,
  role,
  userId,
  mode,
}: CourseViewProps) {
  if (styles.length === 0 || !currentStyle) {
    return <h1 className="type-display">{COPY.title}</h1>;
  }
  return (
    <h1>
      <StyleSheet
        styles={styles}
        currentStyleId={currentStyle.id}
        role={role}
        userId={userId}
        mode={mode}
        returnTo={HOME_LINKS.course}
      >
        {/* Título-selector: eyebrow + display + círculo de 32; el filete se alarga en hover. */}
        <button
          type="button"
          className="group flex w-full min-w-0 items-center gap-4 rounded-md text-left"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="type-eyebrow text-text-secondary">
              {COPY.eyebrow}
            </span>{" "}
            <span className="type-display break-words text-text">
              <StyleName name={currentStyle.name} />
            </span>
            <span
              aria-hidden="true"
              className="h-0.5 w-12 bg-gold-500 transition-[width] duration-move ease-standard group-hover:w-24 group-focus-visible:w-24 motion-reduce:transition-none"
            />
          </span>
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-pill border border-border-input text-text transition-colors duration-hover ease-standard group-hover:border-text motion-reduce:transition-none"
          >
            <ChevronDown strokeWidth={ICON_STROKE} className="size-4.5" />
          </span>
        </button>
      </StyleSheet>
    </h1>
  );
}

function CoursePathList({
  path,
  due,
  subscribed,
}: CourseViewProps & { path: CoursePath }) {
  const units = groupPathByUnit(path);
  const placement = reviewPlacement(path, due.length);
  const anyDone = path.lessons.some((l) => l.status === "completed");
  const lastLessonId = path.lessons.at(-1)?.lessonId;

  const reviewNode = (
    <li key="review" className="-mx-3">
      <ReviewNode due={due} subscribed={subscribed} />
    </li>
  );

  return (
    <div className="flex flex-col gap-10">
      {units.map((unit) => {
        const headingId = `unit-${unit.id}`;
        return (
          <section
            key={unit.id}
            aria-labelledby={headingId}
            className="flex flex-col gap-3"
          >
            <header className="flex items-end justify-between gap-4 border-b border-divider pb-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="type-overline text-text-secondary">
                  {COPY.unit(unit.position)}
                </p>
                <h2 id={headingId} className="type-h2">
                  {unit.title}
                </h2>
              </div>
              <p className="shrink-0 type-small tabular-nums text-text-secondary">
                {COPY.unitCount(unit.done, unit.lessons.length)}
                <span className="sr-only">{COPY.unitCountSr}</span>
              </p>
            </header>
            <ol className="flex flex-col gap-1">
              {unit.lessons.map((lesson) => (
                <Fragment key={lesson.lessonId}>
                  {placement !== null &&
                  placement !== "end" &&
                  placement.before === lesson.lessonId
                    ? reviewNode
                    : null}
                  <li className="-mx-3">
                    <LessonNode lesson={lesson} anyDone={anyDone} />
                  </li>
                  {placement === "end" && lesson.lessonId === lastLessonId
                    ? reviewNode
                    : null}
                </Fragment>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function LessonNode({
  lesson,
  anyDone,
}: {
  lesson: PathLesson;
  anyDone: boolean;
}) {
  const action = anyDone ? COPY.continue : COPY.start;
  return (
    <PathNode
      state={lesson.status}
      number={lesson.number}
      title={lesson.title}
      label={COPY.lesson(lesson.number)}
      href={
        lesson.status === "locked"
          ? undefined
          : HOME_LINKS.lesson(lesson.lessonId)
      }
      actionLabel={action}
      compactAction
      actionAriaLabel={COPY.lessonAction(action, lesson.number, lesson.title)}
    />
  );
}

function ReviewNode({
  due,
  subscribed,
}: {
  due: readonly DueStep[];
  subscribed: boolean;
}) {
  const dueText = COPY.reviewDue(due.length);
  return (
    <PathNode
      state="review"
      number={0}
      title={COPY.reviewTitle}
      label={dueText}
      stateLabel={COPY.reviewMinutes(reviewMinutes(due.length))}
      // Sin plan, repasar lleva a Planes (D036): el camino se ve, la práctica no.
      href={subscribed ? HOME_LINKS.review : HOME_LINKS.plans}
      actionLabel={subscribed ? COPY.review : COPY.activate}
      compactAction
      actionAriaLabel={
        subscribed ? `${COPY.review}: ${dueText}` : COPY.reviewLocked(dueText)
      }
    />
  );
}
