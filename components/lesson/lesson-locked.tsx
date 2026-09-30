import { Lock, X } from "lucide-react";
import Link from "next/link";
import { FullscreenShell } from "@/components/layout/fullscreen-shell";
import { Button, IconButton } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { lessonCopy } from "./copy";

/**
 * Lección bloqueada (`course_path` = `locked`, D098): la pantalla completa con la X, el motivo
 * y "Volver al curso". No hay nada que perder, así que la X no pide confirmación.
 */
export function LessonLocked({
  title,
  number,
  courseHref,
}: {
  title: string;
  number: number | null;
  courseHref: string;
}) {
  return (
    <FullscreenShell
      bar={
        <IconButton asChild variant="outline" aria-label={lessonCopy.exit}>
          <Link href={courseHref}>
            <X aria-hidden="true" strokeWidth={ICON_STROKE} />
          </Link>
        </IconButton>
      }
    >
      <div className="flex flex-col items-start gap-6">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-pill bg-surface-sunken text-text-secondary"
        >
          <Lock strokeWidth={ICON_STROKE} className="size-7" />
        </span>
        <div className="flex flex-col gap-3">
          <p className="type-eyebrow text-gold-700">
            {lessonCopy.eyebrow(number)}
          </p>
          <h1 className="type-h1">{lessonCopy.lockedTitle}</h1>
          <p className="type-body text-text-secondary">
            {lessonCopy.lockedText(title)}
          </p>
        </div>
        <Button asChild size="lg" className="w-full md:max-w-80">
          <Link href={courseHref}>{lessonCopy.backToCourse}</Link>
        </Button>
      </div>
    </FullscreenShell>
  );
}
