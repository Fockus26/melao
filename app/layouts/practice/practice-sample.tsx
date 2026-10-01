"use client";

import { useState } from "react";
import { PracticeView } from "@/components/practice/practice-view";
import type { InvokeResult } from "@/lib/lesson/lesson";
import {
  initialConfig,
  type PracticeSong,
  type PracticeStyle,
  type StartProblem,
} from "@/lib/practice/config";
import type { PracticePorts } from "@/lib/practice/invoke";
import { constantGrid } from "@/supabase/functions/_shared/core/grid";
import {
  MERENGUE,
  SALSA_CASINO,
} from "@/supabase/functions/_shared/core/style";

/**
 * Muestra del configurador sin sesión ni base: dos estilos con canciones de prueba (como las del
 * seed, D054) y un `plan-session` falso. Nada se escribe ni se navega a la sesión.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 64).
 */

export type PracticeSampleState =
  | "ready"
  | "no-subscription"
  | "no-steps"
  | "not-ready"
  | "offline"
  | "no-styles";

const song = (
  id: string,
  title: string,
  bpm: number,
  patch: Partial<PracticeSong> = {},
): PracticeSong => ({
  id,
  title,
  artist: "Melao (placeholder)",
  bpm,
  durationMs: 200000,
  danceEndMs: 185000,
  beatGrid: constantGrid(bpm, 2000),
  difficulty: null,
  favorite: false,
  sessions30d: 0,
  popularity: 0,
  ready: true,
  ...patch,
});

const STYLES: PracticeStyle[] = [
  {
    id: "salsa-casino",
    name: "Salsa casino",
    config: SALSA_CASINO,
    songs: [
      song("s1", "Pista de prueba 1 · casino lento", 160, {
        difficulty: 2,
        sessions30d: 3,
        popularity: 0.5,
      }),
      song("s2", "Pista de prueba 2 · casino medio", 180, {
        difficulty: 3,
        favorite: true,
        sessions30d: 12,
        popularity: 1,
      }),
      song("s3", "Pista de prueba 3 · casino rápido", 200, {
        difficulty: 4,
      }),
      song("s4", "Pista de prueba 4 · sin tiempos marcados", 176, {
        beatGrid: null,
        danceEndMs: null,
        ready: false,
      }),
    ],
  },
  {
    id: "merengue",
    name: "Merengue",
    config: MERENGUE,
    songs: [
      song("m1", "Pista de prueba 5 · merengue medio", 120, { difficulty: 2 }),
      song("m2", "Pista de prueba 6 · merengue rápido", 150, {
        difficulty: 3,
      }),
    ],
  },
];

const error = (status: number, code: string): InvokeResult => ({
  status,
  body: { error: { code, message: "" } },
});

function samplePorts(state: PracticeSampleState): PracticePorts {
  return {
    planSession: async () => {
      if (state === "no-steps") return error(409, "no_steps");
      if (state === "offline") return { status: 0, body: null };
      return { status: 200, body: { sessionId: "sample-session" } };
    },
  };
}

const INITIAL_PROBLEM: Partial<Record<PracticeSampleState, StartProblem>> = {
  "no-steps": "no-steps",
  offline: "offline",
};

export function PracticeSample({ state }: { state: PracticeSampleState }) {
  const [started, setStarted] = useState<string | null>(null);
  const styles = state === "no-styles" ? [] : STYLES;
  const initial = initialConfig(styles, "salsa-casino", {
    song: state === "not-ready" ? "s4" : "s2",
  });
  return (
    <div className="flex flex-col gap-4">
      <PracticeView
        styles={styles}
        initial={initial}
        seed={7}
        subscribed={state !== "no-subscription"}
        ports={samplePorts(state)}
        onStarted={setStarted}
        initialProblem={INITIAL_PROBLEM[state] ?? null}
      />
      <output className="block type-small text-text-secondary">
        {started
          ? `Muestra: plan-session respondió la sesión «${started}». En la app se abriría /app/practice/session?id=${started}.`
          : null}
      </output>
    </div>
  );
}
