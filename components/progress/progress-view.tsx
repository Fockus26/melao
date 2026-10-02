import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Difficulty } from "@/components/indicators/difficulty";
import { LessonProgress } from "@/components/indicators/lesson-progress";
import { RATING_LABELS } from "@/components/indicators/rating-labels";
import {
  StepStatus,
  type StepStatusValue,
} from "@/components/indicators/step-status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ICON_STROKE } from "@/components/ui/icon";
import {
  type CourseSummary,
  type HardStep,
  relativeDays,
  type StyleOption,
} from "@/lib/course/path";
import {
  isFirstDay,
  PROGRESS_LINKS,
  type RecentSession,
  type StepStatusCounts,
} from "@/lib/progress/progress";
import { cn } from "@/lib/utils";
import { progressCopy as COPY } from "./copy";

export type ProgressViewProps = {
  styles: readonly StyleOption[];
  style: StyleOption | null;
  /** Camino resumido del estilo; `null` si no tiene curso publicado. */
  course: CourseSummary | null;
  counts: StepStatusCounts;
  hardest: readonly HardStep[];
  sessions: readonly RecentSession[];
  /** "Ahora" para "hace 2 días". */
  now: Date;
  /** La card de próximos repasos (en la real la pide el navegador con su zona, D130). */
  forecast: React.ReactNode;
  /** Enlace a otro estilo; por defecto `/app/progress?style=`. La muestra usa el suyo. */
  styleHref?: (styleId: string) => string;
};

/**
 * Progreso (handoff § Progreso): display, grilla 1 / 2 de cards (lecciones con barra; pasos por
 * estado con 3 cifras), próximos repasos, lo que más te cuesta (con "Practicar estos") y
 * sesiones recientes (filas de 64). Solo presenta: los datos llegan ya resueltos por las
 * funciones SQL (D003). La usan `/app/progress` y la muestra `/layouts/progress`.
 */
export function ProgressView(props: ProgressViewProps) {
  const { styles, style, course, counts, hardest, sessions, now } = props;
  const styleHref = props.styleHref ?? PROGRESS_LINKS.progress;
  const firstDay =
    !!course?.current &&
    isFirstDay({
      completedLessons: course.completedCount,
      counts,
      hardestCount: hardest.length,
      sessionCount: sessions.length,
    });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {style ? (
            <p className="type-overline text-text-secondary">{style.name}</p>
          ) : null}
          <h1 className="type-display">{COPY.title}</h1>
        </div>
        {styles.length > 1 ? (
          <StyleLinks
            styles={styles}
            currentId={style?.id ?? null}
            href={styleHref}
          />
        ) : null}
      </header>

      {!style ? (
        <p className="type-body text-text-secondary">{COPY.noStyle}</p>
      ) : (
        <>
          {firstDay && course?.current ? (
            <Card className="items-start">
              <div className="flex flex-col gap-1">
                <h2 className="type-h3">{COPY.firstDay}</h2>
                <p className="type-small text-text-secondary">
                  {COPY.firstDayText}
                </p>
              </div>
              <Button asChild>
                <Link href={PROGRESS_LINKS.lesson(course.current.lessonId)}>
                  {COPY.firstDayCta(course.current.number)}
                </Link>
              </Button>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <LessonsCard style={style} course={course} />
            <StepsCard counts={counts} />
            {props.forecast}
          </div>

          <HardestSection hardest={hardest} now={now} styleId={style.id} />
        </>
      )}

      <SessionsSection sessions={sessions} now={now} />
    </div>
  );
}

function StyleLinks({
  styles,
  currentId,
  href,
}: {
  styles: readonly StyleOption[];
  currentId: string | null;
  href: (styleId: string) => string;
}) {
  return (
    <nav aria-label={COPY.styleNav}>
      <ul className="flex flex-wrap gap-2">
        {styles.map((s) => {
          const current = s.id === currentId;
          return (
            <li key={s.id}>
              <Link
                href={href(s.id)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-12 items-center rounded-pill border px-4 type-small transition-colors duration-hover ease-standard motion-reduce:transition-none",
                  current
                    ? "border-primary bg-primary font-semibold text-on-primary"
                    : "border-border-input text-text hover:bg-hover",
                )}
              >
                {s.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CardHeading({ children }: { children: string }) {
  return <h2 className="type-eyebrow text-text-secondary">{children}</h2>;
}

function LessonsCard({
  style,
  course,
}: {
  style: StyleOption;
  course: CourseSummary | null;
}) {
  return (
    <Card className="min-w-0">
      <CardHeading>{COPY.lessons}</CardHeading>
      {!course || course.lessonCount === 0 ? (
        <p className="type-body text-text-secondary">
          {COPY.noCourse(style.name)}
        </p>
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="type-numeric-xl">{course.completedCount}</span>
            <span className="type-body text-text-secondary">
              {COPY.lessonsOf(course.lessonCount)}
            </span>
          </p>
          <LessonProgress
            completed={course.completedCount}
            total={course.lessonCount}
            label={COPY.lessonsBar}
            valueText={COPY.lessonsBarValue(
              course.completedCount,
              course.lessonCount,
            )}
          />
          <Button asChild variant="outline" className="self-start">
            <Link href={PROGRESS_LINKS.course}>{COPY.seeCourse}</Link>
          </Button>
        </>
      )}
    </Card>
  );
}

const STATUS_ORDER: readonly StepStatusValue[] = [
  "unknown",
  "learning",
  "known",
];

function StepsCard({ counts }: { counts: StepStatusCounts }) {
  return (
    <Card className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardHeading>{COPY.steps}</CardHeading>
        {counts.total > 0 ? (
          <p className="type-small text-text-secondary">
            {COPY.stepsTotal(counts.total)}
          </p>
        ) : null}
      </div>
      {counts.total === 0 ? (
        <p className="type-body text-text-secondary">{COPY.stepsEmpty}</p>
      ) : (
        <dl className="grid grid-cols-3 gap-3">
          {STATUS_ORDER.map((status) => (
            <div
              key={status}
              className="flex min-w-0 flex-col-reverse justify-end gap-1"
            >
              <dt>
                <StepStatus status={status} />
              </dt>
              <dd className="type-numeric-xl">{counts[status]}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

function SectionHeader({
  id,
  title,
  action,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-divider pb-2">
      <h2 id={id} className="type-h2">
        {title}
      </h2>
      {action}
    </div>
  );
}

function HardestSection({
  hardest,
  now,
  styleId,
}: {
  hardest: readonly HardStep[];
  now: Date;
  styleId: string;
}) {
  return (
    <section aria-labelledby="progress-hardest" className="flex flex-col gap-2">
      <SectionHeader
        id="progress-hardest"
        title={COPY.hardest}
        action={
          hardest.length > 0 ? (
            <Button asChild variant="outline" className="shrink-0">
              <Link href={PROGRESS_LINKS.practiceReview(styleId)}>
                {COPY.practiceThese}
              </Link>
            </Button>
          ) : null
        }
      />
      {hardest.length === 0 ? (
        <p className="py-4 type-small text-text-secondary">
          {COPY.hardestEmpty}
        </p>
      ) : (
        <ul className="flex flex-col">
          {hardest.map((step) => (
            <li key={step.id} className="border-b border-divider">
              <Link
                href={PROGRESS_LINKS.step(step.slug)}
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

function sessionLine(session: RecentSession, now: Date): string {
  const kind =
    session.mode === "free"
      ? COPY.freeSession
      : COPY.lessonSession(session.lessonTitle);
  return [kind, session.styleName, relativeDays(session.createdAt, now)]
    .filter(Boolean)
    .join(" · ");
}

function SessionsSection({
  sessions,
  now,
}: {
  sessions: readonly RecentSession[];
  now: Date;
}) {
  return (
    <section
      aria-labelledby="progress-sessions"
      className="flex flex-col gap-2"
    >
      <SectionHeader id="progress-sessions" title={COPY.sessions} />
      {sessions.length === 0 ? (
        <p className="py-4 type-small text-text-secondary">
          {COPY.sessionsEmpty}
        </p>
      ) : (
        <ul className="flex flex-col">
          {sessions.map((session) => {
            const body = (
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate type-h4">
                  {session.songTitle ?? COPY.songUnavailable}
                </span>
                <span className="type-small text-text-secondary">
                  {sessionLine(session, now)}
                </span>
              </span>
            );
            return (
              <li key={session.id} className="border-b border-divider">
                {/* La libre abre su resultado (D125); la de lección no enlaza (D132). */}
                {session.mode === "free" ? (
                  <Link
                    href={PROGRESS_LINKS.result(session.id)}
                    className="flex min-h-16 items-center gap-4 rounded-md px-2 py-2 transition-colors duration-hover ease-standard hover:bg-hover motion-reduce:transition-none"
                  >
                    {body}
                    <span className="sr-only">: {COPY.seeResult}</span>
                    <ChevronRight
                      strokeWidth={ICON_STROKE}
                      aria-hidden="true"
                      className="size-4.5 shrink-0 text-text-secondary"
                    />
                  </Link>
                ) : (
                  <div className="flex min-h-16 items-center gap-4 px-2 py-2">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
