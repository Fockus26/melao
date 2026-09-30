"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DanceRole } from "@/lib/course/path";
import {
  type LessonData,
  type LessonStep,
  STAGE_TITLE_ID,
  videoMsFor,
} from "@/lib/lesson/lesson";
import { formatClock } from "@/lib/stage/view";
import { lessonCopy } from "./copy";

const ROLES: DanceRole[] = ["leader", "follower"];

/**
 * 2 · Video del paso (handoff § Lección): eyebrow "Lección 3 · Paso 1 de 2", h1, segmentado de
 * rol (no en pasos libres, D016), marco de video de 300 (radio 12, sunken) con el play de 72 y
 * duración y rol en etiquetas sobre el video, "Por tiempos" con filete gold-500 y filas con el
 * tiempo en gold-700, y "Practicar este paso". Los videos aún no existen: el marco dice "Video
 * en preparación" y el play queda deshabilitado (placeholder, CONTENT_CHECKLIST fila 56).
 */
export function LessonVideo({
  lesson,
  step,
  index,
  onPractice,
}: {
  lesson: LessonData;
  step: LessonStep;
  index: number;
  onPractice: () => void;
}) {
  const [role, setRole] = useState<DanceRole>(lesson.role ?? "leader");
  const shownRole = step.free ? null : role;
  const durationMs = videoMsFor(step, shownRole);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-gold-700">
          {lessonCopy.videoEyebrow(
            lesson.number,
            index + 1,
            lesson.steps.length,
          )}
        </p>
        <h1
          id={STAGE_TITLE_ID}
          tabIndex={-1}
          className="type-h1 focus:outline-none"
        >
          {step.name}
        </h1>
      </header>

      {step.free ? null : (
        <ToggleGroup
          type="single"
          variant="segment"
          aria-label={lessonCopy.roleLabel}
          value={role}
          onValueChange={(v) => {
            if (v) setRole(v as DanceRole);
          }}
        >
          {ROLES.map((r) => (
            <ToggleGroupItem key={r} value={r} className="flex-1">
              {lessonCopy.roles[r]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      <div className="flex flex-col gap-2">
        <div
          data-slot="lesson-video"
          className="relative flex h-75 flex-col items-center justify-center gap-4 overflow-hidden rounded-md bg-surface-sunken md:h-90"
        >
          <button
            type="button"
            disabled
            aria-label={lessonCopy.play}
            className="flex size-18 items-center justify-center rounded-pill bg-primary text-on-primary disabled:cursor-not-allowed"
          >
            <Play
              aria-hidden="true"
              strokeWidth={ICON_STROKE}
              className="size-8 translate-x-0.5"
            />
          </button>
          <p className="type-small text-text-secondary">
            {lessonCopy.videoPending}
          </p>
          <div className="absolute inset-x-3 bottom-3 flex justify-between gap-2">
            {durationMs ? (
              <span className="rounded-sm bg-bg px-2 py-1 type-caption tabular-nums text-text">
                {formatClock(durationMs)}
              </span>
            ) : (
              <span />
            )}
            {shownRole ? (
              <span className="rounded-sm bg-bg px-2 py-1 type-caption text-text">
                {lessonCopy.roles[shownRole]}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <section aria-labelledby="lesson-beats" className="flex flex-col gap-3">
        <h2
          id="lesson-beats"
          className="border-l-2 border-gold-500 pl-3 type-h4"
        >
          {lessonCopy.byBeats}
        </h2>
        {step.beatNotes.length > 0 ? (
          <dl className="flex flex-col border-t border-divider">
            {step.beatNotes.map((n) => (
              <div
                key={n.beat}
                className="flex min-h-12 items-baseline gap-4 border-b border-divider py-3"
              >
                <dt className="w-8 shrink-0 type-h4 tabular-nums text-gold-700">
                  <span className="sr-only">{lessonCopy.beat(n.beat)}</span>
                  <span aria-hidden="true">{n.beat}</span>
                </dt>
                <dd className="type-body text-text">{n.note}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="type-body text-text-secondary">
            {lessonCopy.noBeatNotes}
          </p>
        )}
      </section>

      <Button size="lg" className="w-full md:max-w-80" onClick={onPractice}>
        {lessonCopy.practiceStep}
      </Button>
    </div>
  );
}
