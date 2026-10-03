"use client";

import { Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import type { CalibrationAudio } from "@/lib/calibration/audio";
import { CALIBRATION_INTERVAL_MS } from "@/lib/calibration/calibration";
import { cn } from "@/lib/utils";
import { calibrationCopy as COPY } from "./copy";

const TEST_CLICKS = 8;
const TEST_LEAD_S = 0.5;

/**
 * "Probar con la cuenta": 8 clics en el reloj de audio (acento en el 1 y el 5) y un número que
 * cambia cuando la posición del reloj llega a `clic + offset`, lo mismo que hace la sesión con
 * la cuenta (motor-de-ritmo §6). El número es solo visual (`aria-hidden`): la prueba es de ver
 * y oír a la vez; el botón dice si suena.
 */
export function CountTest({
  audio,
  offsetMs,
  size = "md",
  className,
}: {
  audio: CalibrationAudio;
  offsetMs: number;
  size?: "md" | "lg";
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const frame = useRef(0);

  function stop() {
    cancelAnimationFrame(frame.current);
    audio.stop();
    setPlaying(false);
    setCount(null);
  }

  async function play() {
    try {
      await audio.wake();
    } catch {
      return;
    }
    const clicks = audio.scheduleClicks(
      TEST_CLICKS,
      CALIBRATION_INTERVAL_MS / 1000,
      TEST_LEAD_S,
      4,
    );
    const shift = offsetMs / 1000;
    const end = (clicks.at(-1) ?? 0) + shift + CALIBRATION_INTERVAL_MS / 1000;
    setPlaying(true);
    const loop = () => {
      const now = audio.now();
      if (now === null || now >= end) {
        stop();
        return;
      }
      let shown: number | null = null;
      for (const [i, c] of clicks.entries()) {
        if (now >= c + shift) shown = i + 1;
      }
      setCount(shown);
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
  }

  // Al salir de la pantalla o cambiar de estado, nada queda sonando.
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      audio.stop();
    },
    [audio],
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-md border border-divider bg-surface p-4",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => (playing ? stop() : void play())}
        className="min-w-0 flex-1 basis-48"
      >
        {playing ? (
          <Square aria-hidden="true" strokeWidth={ICON_STROKE} />
        ) : (
          <Play aria-hidden="true" strokeWidth={ICON_STROKE} />
        )}
        {playing ? COPY.testStop : COPY.test}
      </Button>
      <span
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-md bg-surface-sunken type-numeric-lg"
      >
        {count ?? "·"}
      </span>
      <p className="basis-full type-small text-text-secondary">
        {COPY.testHelp}
      </p>
    </div>
  );
}
