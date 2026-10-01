"use client";

import { useId, useState } from "react";
import { RatingButtons } from "@/components/indicators/rating-buttons";
import { Alert, AlertContent, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import type { LessonPorts } from "@/lib/lesson/invoke";
import {
  buildReviewRequest,
  canSubmitRatings,
  isStepDue,
  type LessonData,
  parseReviewCards,
  type RatingChoice,
  ratingProblem,
  STAGE_TITLE_ID,
} from "@/lib/lesson/lesson";
import { lessonCopy } from "./copy";

export type ReviewCards = { stepId: string; role: string; dueAt: string }[];

/**
 * 5 · Calificación (handoff § Lección): h1 "¿Cómo te fue?" y un RatingButtons por paso, sin
 * intervalos (D099: ningún cliente calcula FSRS, D013). Los pasos que no vencen llevan "No vence
 * hoy" y "Saltar este paso". "Terminar lección" manda `review-steps` con la sesión de la
 * práctica final (context `lesson`): eso guarda las tarjetas y, con la final, completa la lección.
 */
export function LessonRating({
  lesson,
  sessionId,
  ports,
  now,
  initialChoices = {},
  onDone,
}: {
  lesson: LessonData;
  sessionId: string;
  ports: LessonPorts;
  now: Date;
  initialChoices?: Record<string, RatingChoice>;
  onDone: (cards: ReviewCards, choices: Record<string, RatingChoice>) => void;
}) {
  const [choices, setChoices] =
    useState<Record<string, RatingChoice>>(initialChoices);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<
    "subscription" | "offline" | "error" | null
  >(null);
  const hintId = useId();
  const ready = canSubmitRatings(lesson.steps, choices);

  const submit = async () => {
    if (!ready || sending) return;
    setSending(true);
    setProblem(null);
    const request = buildReviewRequest(lesson, sessionId, choices, new Date());
    const result = await ports.reviewSteps(request);
    const cards =
      result.status >= 200 && result.status < 300
        ? parseReviewCards(result.body)
        : null;
    setSending(false);
    if (cards) onDone(cards, choices);
    else setProblem(result.status === 200 ? "error" : ratingProblem(result));
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1
          id={STAGE_TITLE_ID}
          tabIndex={-1}
          className="type-h1 focus:outline-none"
        >
          {lessonCopy.ratingTitle}
        </h1>
        <p className="type-body text-text-secondary">
          {lessonCopy.ratingIntro}
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {lesson.steps.map((step) => {
          const due = isStepDue(step, now);
          const choice = choices[step.id];
          const skipped = choice === "skip";
          return (
            <div key={step.id} className="flex flex-col gap-3">
              <RatingButtons
                name={`rating-${step.id}`}
                legend={step.name}
                hint={
                  due
                    ? undefined
                    : skipped
                      ? lessonCopy.skipped
                      : lessonCopy.notDue
                }
                value={typeof choice === "number" ? choice : null}
                onValueChange={(rating) =>
                  setChoices((c) => ({ ...c, [step.id]: rating }))
                }
                disabled={sending}
              />
              {due ? null : (
                <Button
                  variant="quiet"
                  className="self-start"
                  aria-pressed={skipped}
                  disabled={sending}
                  onClick={() =>
                    setChoices((c) => {
                      const next = { ...c };
                      if (skipped) delete next[step.id];
                      else next[step.id] = "skip";
                      return next;
                    })
                  }
                >
                  {lessonCopy.skip}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Error y pista entran y salen con la altura animada (D103). */}
      <Reveal show={Boolean(problem)}>
        {problem ? (
          <Alert variant="error">
            <AlertContent>
              <AlertDescription>
                {lessonCopy.ratingError[problem]}
              </AlertDescription>
            </AlertContent>
          </Alert>
        ) : null}
      </Reveal>

      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          className="w-full md:max-w-80"
          disabled={!ready}
          aria-describedby={ready ? undefined : hintId}
          loading={sending}
          loadingText={lessonCopy.finishing}
          onClick={submit}
        >
          {lessonCopy.finish}
        </Button>
        <Reveal show={!ready}>
          <p id={hintId} className="type-small text-text-secondary">
            {lessonCopy.finishHint}
          </p>
        </Reveal>
      </div>
    </div>
  );
}
