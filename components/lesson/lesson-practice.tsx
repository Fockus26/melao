"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FullscreenShell } from "@/components/layout/fullscreen-shell";
import { Stage } from "@/components/stage/stage";
import { Button } from "@/components/ui/button";
import type { LessonPorts } from "@/lib/lesson/invoke";
import {
  type LessonData,
  type LessonStage,
  type PracticeProblem,
  parsePlanSession,
  practiceProblem,
  practiceSongId,
  STAGE_TITLE_ID,
} from "@/lib/lesson/lesson";
import { createFakeStageSource } from "@/lib/stage/fake-source";
import { sessionStage } from "@/lib/stage/session-source";
import type { StageSource } from "@/lib/stage/source";
import { lessonCopy } from "./copy";
import { ExitConfirm, LessonBar, LessonExitButton } from "./lesson-bar";

type State =
  | { status: "loading" }
  | { status: "ready"; sessionId: string; source: StageSource; bpm: number }
  | { status: "problem"; problem: PracticeProblem };

/**
 * 3 · Mini práctica y 4 · práctica final: al entrar pide la sesión a `plan-session` (la mini con
 * `focusStepId` y la canción de práctica; la final con la canción final) y la muestra en el
 * escenario con el motor FALSO (sin audio: canciones sin licencia, D009), con la barra de la
 * lección en versión oscura. "Continuar" siempre visible (D098). Si la práctica no arranca, el
 * motivo (D098): "Práctica disponible pronto" para quien no tiene la canción, plan, bloqueo o
 * reintentar.
 */
export function LessonPractice({
  lesson,
  stage,
  ports,
  courseHref,
  onContinue,
  onSkip,
  onLeave,
}: {
  lesson: LessonData;
  stage: Extract<LessonStage, { kind: "mini" | "final" }>;
  ports: LessonPorts;
  courseHref: string;
  onContinue: (sessionId: string) => void;
  /** Solo la mini: seguir con la lección sin practicar este paso. */
  onSkip?: () => void;
  onLeave: () => void;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Una sola petición por intento (el doble efecto de StrictMode crearía dos sesiones).
  const requested = useRef<number | null>(null);
  const step = stage.kind === "mini" ? lesson.steps[stage.step] : undefined;

  useEffect(() => {
    if (requested.current === attempt) return;
    requested.current = attempt;
    const songId = practiceSongId(lesson, stage.kind);
    if (!songId) {
      setState({ status: "problem", problem: "soon" });
      return;
    }
    setState({ status: "loading" });
    ports
      .planSession({
        styleId: lesson.styleId,
        songId,
        mode: "lesson",
        lessonId: lesson.id,
        ...(step ? { focusStepId: step.id } : {}),
      })
      .then((result) => {
        const session =
          result.status >= 200 && result.status < 300
            ? parsePlanSession(result.body)
            : null;
        if (!session) {
          setState({
            status: "problem",
            problem: result.status === 200 ? "error" : practiceProblem(result),
          });
          return;
        }
        const song = lesson.songs.find((s) => s.id === songId);
        try {
          const built = sessionStage({
            style: lesson.style,
            plan: session.plan,
            timeline: session.timeline,
            steps: lesson.stepNames,
            beatGrid: song?.beatGrid,
            songDurationMs: song?.durationMs,
          });
          setState({
            status: "ready",
            sessionId: session.sessionId,
            bpm: Math.round(song?.bpm ?? 0),
            source: createFakeStageSource({
              session: built.session,
              startAtMs: built.startMs,
              status: "blocked",
            }),
          });
        } catch {
          setState({ status: "problem", problem: "error" });
        }
      });
  }, [attempt, lesson, ports, stage.kind, step]);

  // Al pasar de "preparando" al escenario (o al motivo) el título se vuelve a montar: el foco
  // vuelve a él, no se pierde en el `body`.
  const shown = useRef(state.status);
  useEffect(() => {
    if (shown.current === state.status) return;
    shown.current = state.status;
    if (state.status !== "loading") {
      document.getElementById(STAGE_TITLE_ID)?.focus();
    }
  }, [state.status]);

  const title =
    stage.kind === "mini" && step
      ? lessonCopy.practiceTitle.mini(step.name)
      : lessonCopy.practiceTitle.final;

  if (state.status === "ready") {
    return (
      <Stage
        source={state.source}
        styleLabel={lesson.styleName}
        bpm={state.bpm}
        title={title}
        titleId={STAGE_TITLE_ID}
        onExit={onLeave}
        exitCopy={{
          title: lessonCopy.exitTitle,
          text: lessonCopy.exitText,
          stay: lessonCopy.exitStay,
          leave: lessonCopy.exitLeave,
        }}
        bar={(wrap) => (
          <LessonBar
            stage={stage}
            exit={wrap(<LessonExitButton tone="stage" />)}
          />
        )}
        footer={
          <Button
            size="lg"
            className="w-full"
            onClick={() => onContinue(state.sessionId)}
          >
            {lessonCopy.continue}
          </Button>
        }
      />
    );
  }

  return (
    <ExitConfirm onLeave={onLeave} tone="stage">
      {(wrap) => (
        <FullscreenShell
          variant="stage"
          bar={
            <LessonBar
              stage={stage}
              exit={wrap(<LessonExitButton tone="stage" />)}
            />
          }
        >
          <div className="mx-auto flex w-full max-w-120 flex-1 flex-col justify-center gap-6 py-8">
            {state.status === "loading" ? (
              <>
                <h1
                  id={STAGE_TITLE_ID}
                  tabIndex={-1}
                  className="sr-only focus:outline-none"
                >
                  {title}
                </h1>
                <output className="flex flex-col items-center gap-4 text-stage-secondary">
                  <span
                    aria-hidden="true"
                    className="inline-block size-10 animate-spinner rounded-pill border-2 border-current border-r-transparent motion-reduce:animate-none"
                  />
                  <span className="type-body">{lessonCopy.preparing}</span>
                </output>
              </>
            ) : (
              <PracticeProblemPanel
                problem={state.problem}
                courseHref={courseHref}
                onRetry={() => setAttempt((n) => n + 1)}
                onSkip={onSkip}
              />
            )}
          </div>
        </FullscreenShell>
      )}
    </ExitConfirm>
  );
}

function PracticeProblemPanel({
  problem,
  courseHref,
  onRetry,
  onSkip,
}: {
  problem: PracticeProblem;
  courseHref: string;
  onRetry: () => void;
  onSkip?: () => void;
}) {
  const copy = lessonCopy.problem[problem];
  const retry = problem === "offline" || problem === "error";
  return (
    <div data-problem={problem} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1
          id={STAGE_TITLE_ID}
          tabIndex={-1}
          className="type-h1 text-stage-current focus:outline-none"
        >
          {copy.title}
        </h1>
        <p className="type-body text-stage-secondary">{copy.text}</p>
      </div>
      <div className="flex flex-col gap-3">
        {retry ? (
          <Button size="lg" className="w-full" onClick={onRetry}>
            {lessonCopy.retry}
          </Button>
        ) : null}
        {problem === "subscription" ? (
          <Button asChild size="lg" className="w-full">
            <Link href="/plans">{lessonCopy.problem.subscription.action}</Link>
          </Button>
        ) : null}
        {problem === "soon" && onSkip ? (
          <Button size="lg" className="w-full" onClick={onSkip}>
            {lessonCopy.skipPractice}
          </Button>
        ) : null}
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href={courseHref}>{lessonCopy.backToCourse}</Link>
        </Button>
      </div>
    </div>
  );
}
