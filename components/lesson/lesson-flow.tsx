"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FullscreenShell } from "@/components/layout/fullscreen-shell";
import { edgeLessonPorts, type LessonPorts } from "@/lib/lesson/invoke";
import {
  LESSON_LINKS,
  type LessonData,
  type LessonStage,
  nextStage,
  type RatingChoice,
  returnDates,
  STAGE_TITLE_ID,
  stageKey,
} from "@/lib/lesson/lesson";
import { ExitConfirm, LessonBar, LessonExitButton } from "./lesson-bar";
import { LessonIntro } from "./lesson-intro";
import { LessonPractice } from "./lesson-practice";
import { LessonRating, type ReviewCards } from "./lesson-rating";
import { LessonSummary } from "./lesson-summary";
import { LessonVideo } from "./lesson-video";

export type LessonFlowProps = {
  lesson: LessonData;
  /** Backend de la lección; la muestra pasa uno falso. */
  ports?: LessonPorts;
  courseHref?: string;
  lessonHref?: (id: string) => string;
  /** Muestra: etapa inicial y lo ya hecho (sesión final, calificaciones, tarjetas). */
  initial?: {
    stage: LessonStage;
    sessionId?: string;
    choices?: Record<string, RatingChoice>;
    cards?: ReviewCards;
  };
  /** Reloj y zona fijos (muestra); por defecto, ahora y la zona del dispositivo. */
  now?: string;
  timeZone?: string;
};

/**
 * Lección a pantalla completa (handoff § Lección, pantallas.md): intro → por paso, video y mini
 * práctica → práctica final → calificación → resumen. El estado vive aquí, en el cliente; lo que
 * tiene reglas lo deciden las Edge Functions (plan-session, review-steps). Al cambiar de etapa
 * el foco va a su título. Tras calificar, `router.refresh()` para que Curso e Inicio vean el
 * progreso.
 */
export function LessonFlow({
  lesson,
  ports = edgeLessonPorts,
  courseHref = LESSON_LINKS.course,
  lessonHref = LESSON_LINKS.lesson,
  initial,
  now: fixedNow,
  timeZone,
}: LessonFlowProps) {
  const router = useRouter();
  const [stage, setStage] = useState<LessonStage>(
    initial?.stage ?? { kind: "intro" },
  );
  const [sessionId, setSessionId] = useState<string | null>(
    initial?.sessionId ?? null,
  );
  const [choices, setChoices] = useState<Record<string, RatingChoice>>(
    initial?.choices ?? {},
  );
  const [cards, setCards] = useState<ReviewCards | null>(
    initial?.cards ?? null,
  );
  const [now] = useState(() => (fixedNow ? new Date(fixedNow) : new Date()));
  const key = stageKey(stage);

  // Foco al título de la etapa nueva (no al cargar la página).
  const shownKey = useRef(key);
  useEffect(() => {
    if (shownKey.current === key) return;
    shownKey.current = key;
    window.scrollTo(0, 0);
    document.getElementById(STAGE_TITLE_ID)?.focus();
  }, [key]);

  const advance = () => setStage((s) => nextStage(s, lesson.steps.length));
  const leave = () => router.push(courseHref);

  if (stage.kind === "mini" || stage.kind === "final") {
    return (
      <LessonPractice
        key={key}
        lesson={lesson}
        stage={stage}
        ports={ports}
        courseHref={courseHref}
        onLeave={leave}
        onSkip={stage.kind === "mini" ? advance : undefined}
        onContinue={(id) => {
          if (stage.kind === "final") setSessionId(id);
          advance();
        }}
      />
    );
  }

  let content: React.ReactNode;
  switch (stage.kind) {
    case "intro":
      content = <LessonIntro lesson={lesson} onStart={advance} />;
      break;
    case "video":
      content = (
        <LessonVideo
          key={key}
          lesson={lesson}
          step={lesson.steps[stage.step]}
          index={stage.step}
          onPractice={advance}
        />
      );
      break;
    case "rating":
      content = sessionId ? (
        <LessonRating
          lesson={lesson}
          sessionId={sessionId}
          ports={ports}
          now={now}
          initialChoices={choices}
          onDone={(result, chosen) => {
            setChoices(chosen);
            setCards(result);
            setStage({ kind: "summary" });
            router.refresh();
          }}
        />
      ) : null;
      break;
    default:
      content = (
        <LessonSummary
          lesson={lesson}
          // Los saltados no van en la petición: conservan su fecha.
          dates={returnDates(
            lesson,
            (cards ?? []).filter((c) => choices[c.stepId] !== "skip"),
          )}
          now={now}
          timeZone={timeZone}
          courseHref={courseHref}
          lessonHref={lessonHref}
        />
      );
  }

  // En el resumen la lección ya está guardada: la X sale sin preguntar.
  if (stage.kind === "summary") {
    return (
      <FullscreenShell
        bar={
          <LessonBar
            stage={stage}
            exit={<LessonExitButton onClick={leave} />}
          />
        }
      >
        {content}
      </FullscreenShell>
    );
  }

  return (
    <ExitConfirm onLeave={leave}>
      {(wrap) => (
        <FullscreenShell
          bar={<LessonBar stage={stage} exit={wrap(<LessonExitButton />)} />}
        >
          {content}
        </FullscreenShell>
      )}
    </ExitConfirm>
  );
}
