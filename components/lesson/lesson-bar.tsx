"use client";

import { X } from "lucide-react";
import { LessonProgress } from "@/components/indicators/lesson-progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ICON_STROKE } from "@/components/ui/icon";
import {
  LESSON_STAGE_COUNT,
  type LessonStage,
  stageNumber,
} from "@/lib/lesson/lesson";
import { cn } from "@/lib/utils";
import { lessonCopy } from "./copy";

/**
 * Barra de la lección (handoff § Lección): X de 48 que pide confirmación, LessonProgress y
 * "n / 6". En la práctica va en su versión oscura dentro del escenario (`dark` del subárbol).
 * `exit` es la X ya envuelta en el disparador de la confirmación.
 */
export function LessonBar({
  stage,
  exit,
}: {
  stage: LessonStage;
  exit: React.ReactNode;
}) {
  const n = stageNumber(stage);
  return (
    <>
      {exit}
      <LessonProgress
        className="min-w-0 flex-1"
        completed={n}
        total={LESSON_STAGE_COUNT}
        label={lessonCopy.progressLabel}
        valueText={lessonCopy.progressValue(
          n,
          LESSON_STAGE_COUNT,
          lessonCopy.stageNames[stage.kind],
        )}
      />
    </>
  );
}

/** La X de 48: borde de input en la app; en el escenario, el borde de sus controles. */
export function LessonExitButton({
  tone = "app",
  ...props
}: React.ComponentProps<"button"> & { tone?: "app" | "stage" }) {
  return (
    <button
      type="button"
      aria-label={lessonCopy.exit}
      {...props}
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-pill border transition-colors duration-hover ease-standard motion-reduce:transition-none",
        tone === "stage"
          ? "border-stage-control-border text-stage-current hover:bg-stage-panel"
          : "border-border-input text-text hover:border-text hover:bg-hover",
        props.className,
      )}
    >
      <X aria-hidden="true" strokeWidth={ICON_STROKE} className="size-6" />
    </button>
  );
}

/**
 * Confirmación de salida de la lección (D070: primero la acción segura). `children` recibe con
 * qué envolver el botón que la abre; el foco vuelve a él al cerrar.
 */
export function ExitConfirm({
  onLeave,
  tone = "app",
  children,
}: {
  onLeave: () => void;
  tone?: "app" | "stage";
  children: (
    wrap: (button: React.ReactElement) => React.ReactNode,
  ) => React.ReactNode;
}) {
  return (
    <AlertDialog>
      {children((button) => (
        <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
      ))}
      <AlertDialogContent
        className={
          tone === "stage" ? "dark border-divider bg-stage-panel" : undefined
        }
      >
        <AlertDialogTitle>{lessonCopy.exitTitle}</AlertDialogTitle>
        <AlertDialogDescription>{lessonCopy.exitText}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>{lessonCopy.exitStay}</AlertDialogCancel>
          <AlertDialogAction onClick={onLeave}>
            {lessonCopy.exitLeave}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
