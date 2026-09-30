import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import {
  type LessonData,
  type ReturnDate,
  returnDay,
  STAGE_TITLE_ID,
} from "@/lib/lesson/lesson";
import { lessonCopy } from "./copy";

function returnText(dueAt: string | null, now: Date, timeZone?: string) {
  const day = returnDay(dueAt, now, timeZone);
  if (day === null) return lessonCopy.noDate;
  if (day === "today") return lessonCopy.returnsToday;
  if (day === "tomorrow") return lessonCopy.returnsTomorrow;
  return lessonCopy.returnsOn(day.date);
}

/**
 * 6 · Resumen (handoff § Lección): check en círculo gold-600, eyebrow, display, "Al repaso" con
 * la fecha de regreso de cada paso (de la respuesta de review-steps), card de la siguiente
 * lección (de `course_path`) con su CTA y "Volver al curso".
 */
export function LessonSummary({
  lesson,
  dates,
  now,
  timeZone,
  courseHref,
  lessonHref,
}: {
  lesson: LessonData;
  dates: ReturnDate[];
  now: Date;
  /** Zona de las fechas; por defecto, la del dispositivo. */
  timeZone?: string;
  courseHref: string;
  lessonHref: (id: string) => string;
}) {
  const next = lesson.next;
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-start gap-3">
        <span
          aria-hidden="true"
          className="mb-2 flex size-16 items-center justify-center rounded-pill border-2 border-gold-600 text-gold-700"
        >
          <Check strokeWidth={ICON_STROKE} className="size-8" />
        </span>
        <p className="type-eyebrow text-gold-700">{lessonCopy.doneEyebrow}</p>
        <h1
          id={STAGE_TITLE_ID}
          tabIndex={-1}
          className="type-display focus:outline-none"
        >
          {lessonCopy.doneTitle(lesson.title)}
        </h1>
      </header>

      <section aria-labelledby="lesson-review" className="flex flex-col gap-3">
        <h2 id="lesson-review" className="type-h4">
          {lessonCopy.toReview}
        </h2>
        <p className="type-body text-text-secondary">
          {lessonCopy.toReviewText}
        </p>
        <ul className="flex flex-col border-t border-divider">
          {dates.map((d) => (
            <li
              key={d.stepId}
              className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-divider py-3"
            >
              <span className="type-body text-text">{d.name}</span>
              <span className="type-small text-text-secondary">
                {returnText(d.dueAt, now, timeZone)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {next ? (
        <section
          aria-labelledby="lesson-next"
          className="flex flex-col gap-4 rounded-md border border-divider bg-surface p-5"
        >
          <p className="type-overline text-text-secondary">
            {lessonCopy.nextEyebrow(next.number)}
          </p>
          <h2 id="lesson-next" className="type-h3">
            {next.title}
          </h2>
          <Button asChild size="lg" className="w-full md:max-w-80">
            <Link href={lessonHref(next.id)}>
              {lessonCopy.nextCta(next.number)}
            </Link>
          </Button>
        </section>
      ) : (
        <p className="type-body">{lessonCopy.courseDone}</p>
      )}

      <Button
        asChild
        variant={next ? "quiet" : "primary"}
        size={next ? "md" : "lg"}
        className="self-start"
      >
        <Link href={courseHref}>{lessonCopy.backToCourse}</Link>
      </Button>
    </div>
  );
}
