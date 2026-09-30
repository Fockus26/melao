import { Button } from "@/components/ui/button";
import {
  estimateMinutes,
  type LessonData,
  STAGE_TITLE_ID,
} from "@/lib/lesson/lesson";
import { lessonCopy } from "./copy";

/**
 * 1 · Intro (handoff § Lección): eyebrow, display con el nombre, "2 pasos nuevos · unos 8
 * minutos" (los minutos se omiten si no hay datos, D097), lista numerada de pasos en filas de
 * 64, "Cómo va" en un párrafo y Empezar.
 */
export function LessonIntro({
  lesson,
  onStart,
}: {
  lesson: LessonData;
  onStart: () => void;
}) {
  const minutes = estimateMinutes(lesson);
  const total = lesson.steps.length;
  const allNew = total > 0 && lesson.steps.every((s) => s.dueAt === null);
  const meta = [
    total > 0 ? lessonCopy.stepCount(total, allNew) : null,
    minutes !== null ? lessonCopy.minutes(minutes) : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-gold-700">
          {lessonCopy.eyebrow(lesson.number)}
        </p>
        <h1
          id={STAGE_TITLE_ID}
          tabIndex={-1}
          className="type-display focus:outline-none"
        >
          {lesson.title}
        </h1>
        {meta.length > 0 ? (
          <p className="type-body text-text-secondary">{meta.join(" · ")}</p>
        ) : null}
        {lesson.intro ? <p className="type-body">{lesson.intro}</p> : null}
      </header>

      <section aria-labelledby="lesson-steps" className="flex flex-col gap-3">
        <h2 id="lesson-steps" className="type-h4">
          {lessonCopy.stepsTitle}
        </h2>
        {total > 0 ? (
          <ol className="flex flex-col border-t border-divider">
            {lesson.steps.map((step, i) => (
              <li
                key={step.id}
                className="flex min-h-16 items-center gap-4 border-b border-divider"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-pill border border-gold-600 type-small tabular-nums text-text"
                >
                  {i + 1}
                </span>
                <span className="type-body text-text">{step.name}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="type-body text-text-secondary">{lessonCopy.noSteps}</p>
        )}
      </section>

      <section aria-labelledby="lesson-how" className="flex flex-col gap-2">
        <h2 id="lesson-how" className="type-h4">
          {lessonCopy.howTitle}
        </h2>
        <p className="type-body text-text-secondary">{lessonCopy.how}</p>
      </section>

      <Button
        size="lg"
        className="w-full md:max-w-80"
        onClick={onStart}
        disabled={total === 0}
      >
        {lessonCopy.start}
      </Button>
    </div>
  );
}
