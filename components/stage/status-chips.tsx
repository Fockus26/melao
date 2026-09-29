import { MonitorOff, Pause, VolumeX } from "lucide-react";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { stageCopy } from "./copy";

/**
 * Chips de estado (handoff §3 punto 2): En pausa · Cuenta en silencio · aviso de pantalla. Alto
 * reservado de 32 para que nada salte al aparecer. Cada uno con ícono y texto (nunca solo
 * color); el aviso lleva `warning-bg` + borde e ícono `warning`, texto `current` (14.17:1).
 */
export function StatusChips({
  paused,
  voiceOff,
  screenMayTurnOff,
  className,
}: {
  paused: boolean;
  voiceOff: boolean;
  screenMayTurnOff: boolean;
  className?: string;
}) {
  const chip =
    "inline-flex h-7 items-center gap-1.5 rounded-pill border px-3 type-caption text-stage-current";
  const icon = "size-4 shrink-0";
  return (
    <ul
      data-slot="stage-chips"
      className={cn("flex min-h-8 flex-wrap items-center gap-2", className)}
    >
      {paused && (
        <li className={cn(chip, "border-stage-track bg-stage-panel")}>
          <Pause
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
            className={icon}
          />
          {stageCopy.paused}
        </li>
      )}
      {voiceOff && (
        <li className={cn(chip, "border-stage-track bg-stage-panel")}>
          <VolumeX
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
            className={icon}
          />
          {stageCopy.voiceOff}
        </li>
      )}
      {screenMayTurnOff && (
        <li className={cn(chip, "border-stage-warning bg-stage-warning-bg")}>
          <MonitorOff
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
            className={cn(icon, "text-stage-warning")}
          />
          {stageCopy.screen}
        </li>
      )}
    </ul>
  );
}
