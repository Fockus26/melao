"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { BeatRow } from "@/components/indicators/beat-row";
import { RatingButtons } from "@/components/indicators/rating-buttons";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import type { SrsRating } from "@/supabase/functions/_shared/core/srs";
import { SALSA_CASINO } from "@/supabase/functions/_shared/core/style";

/*
 * Demostraciones con estado de /indicadores. Todo el texto es de ejemplo (placeholder realista,
 * CONTENT_CHECKLIST fila 35): pasos e intervalos no son el catálogo ni un cálculo FSRS real.
 */

const INTERVALS: Record<SrsRating, string> = {
  1: "< 1 día",
  2: "1 día",
  3: "3 días",
  4: "8 días",
};

export function RatingDemo() {
  const [rating, setRating] = useState<SrsRating | null>(null);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <RatingButtons
          name="calificacion-enchufla"
          legend="Enchufla"
          intervals={INTERVALS}
          value={rating}
          onValueChange={setRating}
        />
        <p className="type-small text-text-secondary">
          {rating === null
            ? "Aún sin calificar."
            : `Elegiste: repasas en ${INTERVALS[rating]}.`}
        </p>
      </div>
      <RatingButtons
        name="calificacion-dile-que-no"
        legend="Dile que no"
        intervals={INTERVALS}
        defaultValue={3}
      />
      <RatingButtons
        name="calificacion-sombrero"
        legend="Sombrero (deshabilitado mientras se guarda)"
        intervals={INTERVALS}
        defaultValue={2}
        disabled
      />
    </div>
  );
}

/** 184 BPM → un tiempo cada 326 ms. Solo en la muestra: el escenario usa el reloj de audio. */
const DEMO_BPM = 184;
const SILENT = Array.from(
  { length: SALSA_CASINO.beatsPerPhrase },
  (_, i) => i + 1,
).filter((b) => !SALSA_CASINO.spokenBeats.includes(b));

export function BeatRowDemo() {
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState<number | null>(1);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () => setBeat((b) => ((b ?? 0) % SALSA_CASINO.beatsPerPhrase) + 1),
      60_000 / DEMO_BPM,
    );
    return () => clearInterval(id);
  }, [playing]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md bg-stage-bg px-5 py-7">
        <BeatRow
          beatsPerPhrase={SALSA_CASINO.beatsPerPhrase}
          silentBeats={SILENT}
          activeBeat={beat}
        />
      </div>
      <div>
        <Button variant="outline" onClick={() => setPlaying((p) => !p)}>
          {playing ? (
            <Pause strokeWidth={ICON_STROKE} aria-hidden="true" />
          ) : (
            <Play strokeWidth={ICON_STROKE} aria-hidden="true" />
          )}
          {playing ? "Detener la demo" : "Animar a 184 BPM"}
        </Button>
      </div>
    </div>
  );
}
