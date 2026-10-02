"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DanceRole } from "@/lib/course/path";
import { formatClock } from "@/lib/stage/view";
import {
  initialVideoRole,
  type StepDetail,
  videoFor,
} from "@/lib/steps/detail";
import { detailCopy } from "./copy";

const ROLES: DanceRole[] = ["leader", "follower"];

/**
 * Video del paso (handoff § App-Paso): segmentado de rol (no en pasos libres ni en estilos sin
 * roles, D016) y marco de 280 (radio 12, sunken) con el play de 72, la duración y el rol. Mismo
 * patrón que el video de la Lección (`components/lesson/lesson-video.tsx`, pendiente de unificar):
 * los videos aún no existen, el marco dice "Video en preparación" y el play queda deshabilitado
 * (placeholder, CONTENT_CHECKLIST fila 56). En un paso libre, una nota explica por qué no hay rol.
 */
export function StepVideo({
  step,
}: {
  step: Pick<StepDetail, "free" | "role" | "videos" | "category">;
}) {
  const [role, setRole] = useState<DanceRole>(
    initialVideoRole(step) ?? "leader",
  );
  const shownRole = step.free ? null : role;
  const durationMs = videoFor(step, shownRole)?.durationMs ?? null;

  return (
    <div className="flex flex-col gap-4">
      {step.free ? null : (
        <ToggleGroup
          type="single"
          variant="segment"
          aria-label={detailCopy.roleLabel}
          value={role}
          onValueChange={(v) => {
            if (v) setRole(v as DanceRole);
          }}
        >
          {ROLES.map((r) => (
            <ToggleGroupItem key={r} value={r} className="flex-1">
              {detailCopy.roles[r]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      <div
        data-slot="step-video"
        className="relative flex h-70 flex-col items-center justify-center gap-4 overflow-hidden rounded-md bg-surface-sunken"
      >
        <button
          type="button"
          disabled
          aria-label={detailCopy.play}
          className="flex size-18 items-center justify-center rounded-pill bg-primary text-on-primary disabled:cursor-not-allowed"
        >
          <Play
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
            className="size-8 translate-x-0.5"
          />
        </button>
        <p className="type-small text-text-secondary">
          {detailCopy.videoPending}
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
              {detailCopy.roles[shownRole]}
            </span>
          ) : null}
        </div>
      </div>

      {step.free ? (
        <p className="type-small text-text-secondary">
          {step.category === "libre"
            ? detailCopy.freeNote.libre
            : detailCopy.freeNote.noRoles}
        </p>
      ) : null}
    </div>
  );
}
