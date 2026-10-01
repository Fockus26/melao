import { FAKE_BPM, FAKE_STEPS } from "@/lib/stage/fake-source";
import type { PracticeSessionData } from "@/lib/stage/practice-session";
import { constantGrid } from "@/supabase/functions/_shared/core/grid";
import { SALSA_CASINO } from "@/supabase/functions/_shared/core/style";

/**
 * Sesión de ejemplo para `/layouts/session`: salsa casino a 184 BPM con los pasos de la muestra
 * del escenario dos veces (~45 s). Rejilla constante con el primer 1 a los 4 s, como una canción
 * con intro; sin calibración guardada. Nombres reales del catálogo (CONTENT_CHECKLIST fila 40).
 */
const FIRST_ONE_MS = 4000;

const steps = [...FAKE_STEPS, ...FAKE_STEPS];

let startPhrase = 1;
const plan = steps.map((s) => {
  const item = { stepId: s.stepId, startPhrase, phrases: s.phrases };
  startPhrase += s.phrases;
  return item;
});

export const SAMPLE_SESSION: PracticeSessionData = {
  sessionId: "sample-session",
  styleName: "Salsa casino",
  bpm: FAKE_BPM,
  style: SALSA_CASINO,
  plan,
  steps: Object.fromEntries(
    FAKE_STEPS.map((s) => [s.stepId, { slug: s.slug, name: s.name }]),
  ),
  beatGrid: constantGrid(FAKE_BPM, FIRST_ONE_MS),
  songDurationMs: null,
  latencyOffsetMs: null,
};
